# Avalant Tokenomics Sync

The main script is `sync.js`. The first run will be a full sync of all historical contract events. After that, it will be incremental syncs from the highest previously sync block. The state is stored in a sqlite db in the file `database.db` (which gets created on first run).

## How to install
`yarn install`

## How to run
`node sync.js`

Recommended to run on cron every 5 minutes
