
/**
 * Any Avalanche RPC Endpoint will do. I chose Ankr here because the main one was
 * having rate limiting issues recently
 */
export const AVALANCHE_RPC_ENDPOINT = 'https://rpc.ankr.com/avalanche';

/**
 * The project token for Mixpanel
 */
export const MIXPANEL_PROJECT_TOKEN = 'cd0f24e99acbf23e2a64e68de2dc9bf4';

/**
 * The api secret for Mixpanel - this is used so we can import older data
 */
export const MIXPANEL_API_SECRET = 'a5defc4bc0a2a400d6e5fc433ef4dd38';

/**
 * How many events we want to load into memory and process in a single batch
 */
export const CONTRACT_EVENT_BATCH_SIZE = 1000;

/**
 * this is appended to the end of every Mixpanel event sent.
 * This can be used when doing a full resync to differentiate
 * between from events sent in previous full syncs.
 *
 * This is useful if you just want to "start fresh"
 */
export const EVENT_SUFFIX = 1647469796;
