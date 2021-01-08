#!/bin/bash
npm run merge-contracts
npx prettier --write "{contracts,interfaces,audit}/**/*.sol"
npx prettier --write "{scripts,test,config,migrations}/**/*.js"