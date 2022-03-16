import Web3 from 'web3';

import {AVALANCHE_RPC_ENDPOINT, CONTRACT_EVENT_BATCH_SIZE} from './settings.js';
import {ensureTables, getBlockTimestamps, getLastSync, recordSync} from './utils.js';
import antgConfig from './syncConfigs/antg.js';
import sugaConfig from './syncConfigs/suga.js';

async function syncBatch(syncConfig, contract, fromBlock, toBlock) {
    console.log(`Syncing blocks ${fromBlock} -> ${toBlock}...`);

    const events = await contract.getPastEvents("allEvents", {
        fromBlock,
        toBlock,
    });

    const timestamps = await getBlockTimestamps([...(new Set(events.map(event => event.blockNumber)))]);
    const mappedEventPromises = events.map(event => {
        try {
            const timestamp = timestamps[event.blockNumber];
            return syncConfig[event.event]?.(event, timestamp);
        } catch (err) {
            console.log(err);
            throw err;
        }
    }).filter(Boolean);
    const mappedEvents = await Promise.all(mappedEventPromises);
    return syncConfig.onBatchComplete(mappedEvents);
}

async function runSync(syncConfig) {
    console.log(`Starting sync for ${syncConfig.name}...`);

    const start = Date.now();
    const web3 = new Web3(AVALANCHE_RPC_ENDPOINT);

    // ensure our SQLite tables exist
    await ensureTables();

    // determine block range
    const lastSyncDetails = await getLastSync(syncConfig.name);
    const lastBlockSeen = lastSyncDetails?.endBlock;
    const startBlock = lastBlockSeen && !isNaN(parseInt(lastBlockSeen)) ? parseInt(lastBlockSeen) + 1 : syncConfig.startBlock;
    const endBlock = await web3.eth.getBlockNumber();

    const contract = new web3.eth.Contract(syncConfig.abi, syncConfig.address);

    // query and process contract events for block range in batches
    for (let i = startBlock; i <= endBlock; i = i + CONTRACT_EVENT_BATCH_SIZE + 1) {
        // execute batches serially
        await syncBatch(syncConfig, contract, i, Math.min(i + CONTRACT_EVENT_BATCH_SIZE, endBlock));
    }

    // save sync details in SQLite db
    await recordSync(syncConfig.name, startBlock, endBlock, start, Date.now());

    console.log(`Took ${Math.ceil((Date.now() - start) / 1000)} seconds to sync ${syncConfig.name}`);
}

const configs = [antgConfig, sugaConfig];
for (let i = 0; i < configs.length; i++) {
    await runSync(configs[i]); // sync serially
}
