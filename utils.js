
import crypto from 'crypto';
import Web3 from 'web3';
import { open } from 'sqlite'
import sqlite3 from 'sqlite3';
import {AVALANCHE_RPC_ENDPOINT} from './settings.js';

const web3 = new Web3(AVALANCHE_RPC_ENDPOINT);
const sv = sqlite3.verbose()

// open the database
const db = await open({
    filename: './database.db',
    driver: sv.Database
})

export async function ensureTables() {
    await db.run("CREATE TABLE IF NOT EXISTS syncs (id, INTEGER PRIMARY KEY, jobName TEXT, startBlock INTEGER, endBlock INTEGER, startTime INTEGER, endTime INTEGER)");
    await db.run("CREATE TABLE IF NOT EXISTS avalanche_block_timestamps (blockNumber TEXT PRIMARY KEY, timestamp INTEGER)");
}

/**
 * Gets a list of timestamps for blocks.
 *
 * Blockchain requests can be quite slow sometimes so if we've previously seen the block we will cache it in SQLite.
 * This is particularly useful when doing full resyncs.
 *
 * @param {number[]} blockNumbers
 * @returns {number[]}
 */
export async function getBlockTimestamps(blockNumbers) {
    const start = Date.now();
    let cachedBlocks = await db.all(`SELECT blockNumber, timestamp FROM avalanche_block_timestamps WHERE blockNumber IN ("${blockNumbers.map(n => n.toString()).join(`","`)}")`);
    const cachedBlockNumbers = cachedBlocks.map(row => row.blockNumber);
    const missingBlockNumbers = blockNumbers.filter(number => !cachedBlockNumbers.includes(number.toString()));
    const batch = new web3.eth.BatchRequest();
    const promises = missingBlockNumbers.map(blockNumber => {
        return new Promise((resolve, reject) => {
            batch.add(web3.eth.getBlock.request(blockNumber, (err, block) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(block);
                }
            }));
        });
    });

    batch.execute();
    const fetchedBlockNumbers = (await Promise.all(promises)).map(block => ({blockNumber: block.number, timestamp: block.timestamp}));

    if (fetchedBlockNumbers.length) {
        const values = fetchedBlockNumbers.map(block => `('${block.blockNumber}', ${block.timestamp})`).join(`, `)
        await db.run(`REPLACE INTO avalanche_block_timestamps VALUES ${values}`);
    }

    console.log(`[getBlockTimestamps] ${cachedBlockNumbers.length} cached / ${fetchedBlockNumbers.length} fetched`);

    const blockMap = [...cachedBlocks, ...fetchedBlockNumbers].reduce((acc, block) => {
        acc[block.blockNumber] = block.timestamp;
        return acc;
    }, {})

    console.log(`[getBlockTimestamps] Finished in ${(Date.now() - start) / 1000} seconds`);

    return blockMap;
}

export function recordSync(contractName, startBlock, endBlock, startTime, endTime) {
    return db.run(`INSERT INTO syncs (jobName, startBlock, endBlock, startTime, endTime) VALUES (?, ?, ?, ?, ?)`, contractName, startBlock, endBlock, startTime, endTime);
}

export function getLastSync(contractName) {
    return db.get(`SELECT startBlock, endBlock, startTime, endTime FROM syncs WHERE jobName = ? ORDER BY endTime DESC LIMIT 1`, contractName);
}

/**
 * Creates a unique identifier for the mixpanel event
 */
export function generateMixpanelDistinctId(transactionHash, logIndex, eventSuffix,) {
    return crypto.createHash('md5').update(`${transactionHash}-${logIndex}-${eventSuffix}`).digest('hex');
}

/**
 * Takes BigInt representing wei and turns it into the ether (avax, etc) equivalent
 * @param {BigInt} value
 * @returns {number}
 */
export function formatBigValue(value) {
    return parseInt(BigInt(value) / BigInt(1e12)) / 1e6
}
