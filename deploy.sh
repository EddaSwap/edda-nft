#!/bin/bash

[[ -f "env.sh" ]] && source "env.sh"

npm run deploy

# Prepare some test assets for fake contracts
if [ -n "${DEPLOY_FAKE_CONTRACTS}" ]; then
    echo "DEV_POPULATE"
    # npm run exec -- ./scripts/dev_populate.js
fi

# Prepare some test assets if no fake contracts
if [ -n "${MINT_TEST_TOKENS}" ]; then
    npm run exec -- ./scripts/dev_mint.js
fi
