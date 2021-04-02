## Prerequisites

This directory should have siblings:

```
edda-dapp
```

## Deploy

```
npm install
export NODE_ENV=(fork|mainnet|...)
# Edit .env.${NODE_ENV}.local
npm run deploy
./artifacts2dapp.sh
```
