import Mixpanel from 'mixpanel';
import {MIXPANEL_API_SECRET, MIXPANEL_PROJECT_TOKEN, EVENT_SUFFIX} from '../settings.js';
import {formatBigValue, generateMixpanelDistinctId} from '../utils.js';
import abi from '../abis/antg.js';

const mixpanel = Mixpanel.init(MIXPANEL_PROJECT_TOKEN, {secret: MIXPANEL_API_SECRET});

/**
 * Sync config for ANTG contract
 * Maps contract events to Mixpanel events and sends them in batches to Mixpanel
 */
export default {
    name: "ANTG",
    abi,
    address: "0xCa1068444196cdfE676Fd15A29F35e502580A69E",
    startBlock: 11511725,
    events: {
        Transfer: (event, timestamp) => {
            const {transactionHash, logIndex, returnValues: {from, to, value}} = event;
            const properties = {
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
                event: `[Avalant] Antg - Transfer${EVENT_SUFFIX}`,
                properties,
            };
        },
    },
    onBatchComplete: function(mixpanelEvents) {
        if (mixpanelEvents.length) {
            console.log(`Sending ${mixpanelEvents.length} events to Mixpanel...`);
            return mixpanel.import_batch(mixpanelEvents, (errors) => {
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
