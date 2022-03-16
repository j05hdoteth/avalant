import Mixpanel from 'mixpanel';
import {MIXPANEL_API_SECRET, MIXPANEL_PROJECT_TOKEN, EVENT_SUFFIX} from '../settings.js';
import {formatBigValue, generateMixpanelDistinctId} from '../utils.js';
import abi from '../abis/suga.js';

const mixpanel = Mixpanel.init(MIXPANEL_PROJECT_TOKEN, {secret: MIXPANEL_API_SECRET});

/**
 * Sync config for SUGA contract
 * Maps contract events to Mixpanel events and sends them in batches to Mixpanel
 */
export default {
    name: "SUGA",
    abi,
    address: "0x7797c14a96fd481420d46993c64a1eb293f670d4",
    startBlock: 11511725,
    events: {
        Transfer: (event, timestamp) => {
            const {transactionHash, logIndex, returnValues: {from, to, value}} = event;
            const properties ={
                time: timestamp,
                distinct_id: from,
                $insert_id: generateMixpanelDistinctId(transactionHash, logIndex, EVENT_SUFFIX),
                transactionId: transactionHash,
                logIndex: logIndex,
                from,
                to,
                rawValue: value,
                value: formatBigValue(value),
            }
            return {
                event: `[Avalant] Suga - Transfer${EVENT_SUFFIX}`,
                properties,
            };
        },

        AntGSwap: (event, timestamp) => {
            const {transactionHash, logIndex, returnValues: {swaper, antg}} = event;
            const properties ={
                time: timestamp,
                distinct_id: swaper,
                $insert_id: generateMixpanelDistinctId(transactionHash, logIndex, EVENT_SUFFIX),
                transactionId: transactionHash,
                logIndex: logIndex,
                swaper,
                rawAntg: antg,
                antg: formatBigValue(antg),
            }

            return {
                event: `[Avalant] Suga - AntGSwap${EVENT_SUFFIX}`,
                properties,
            };
        },

        StakedAntG: (event, timestamp) => {
            const {transactionHash, logIndex, returnValues: {staker, antg}} = event;
            const properties ={
                time: timestamp,
                distinct_id: staker,
                $insert_id: generateMixpanelDistinctId(transactionHash, logIndex, EVENT_SUFFIX),
                transactionId: transactionHash,
                logIndex: logIndex,
                staker,
                rawAntg: antg,
                antg: formatBigValue(antg),
            }

            return {
                event: `[Avalant] Suga - StakedAntG${EVENT_SUFFIX}`,
                properties,
            };
        },

        UnstakedAntG: (event, timestamp) => {
            const {transactionHash, logIndex, returnValues: {staker, antg}} = event;
            const properties = {
                time: timestamp,
                distinct_id: staker,
                $insert_id: `${generateMixpanelDistinctId(transactionHash)}-${event.logIndex}-${EVENT_SUFFIX}`,
                transactionId: transactionHash,
                logIndex: logIndex,
                staker,
                rawAntg: antg,
                antg: formatBigValue(antg),
            }

            return {
                event: `[Avalant] Suga - UnstakedAntG${EVENT_SUFFIX}`,
                properties,
            };
        },
    },
    onBatchComplete: function(mixpanelEvents) {
        if (mixpanelEvents.length) {
            console.log(`Sending ${mixpanelEvents.length} events to Mixpanel...`);
            mixpanel.import_batch(mixpanelEvents, (errors) => {
                if (errors) {
                    console.error(`Error sending to Mixpane: ${JSON.stringify(errors)}`);
                    reject(errors);
                } else {
                    console.log(`Sent ${mixpanelEvents.length} events to Mixpanel.`);
                    resolve();
                }
            });
        }
    },
}
