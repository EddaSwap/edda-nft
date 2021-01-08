#!/bin/bash

if [ -z "$NODE_ENV" ]
then
    echo -e "\n\033[31m'NODE_ENV' is not declared!!!\033[0m\n"
fi

set -o allexport
[[ -f ".env.defaults" ]] && source ".env.defaults"
[[ -f ".env" ]] && source ".env"
[[ -f ".env.local" ]] && source ".env.local"
[[ -f ".env.${NODE_ENV}" ]] && source ".env.${NODE_ENV}"
[[ -f ".env.${NODE_ENV}.local" ]] && source ".env.${NODE_ENV}.local"
set +o allexport
