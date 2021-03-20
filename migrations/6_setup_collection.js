const fs = require('fs').promises
const { BN } = require('@openzeppelin/test-helpers')

const EddaNftStakeArtifact = artifacts.require('EddaNftStake')

let TOKENS = require('./tokens01.json')

const POOL_MAX_STAKE = new BN(`${5 * 10 ** 18}`)
const POOL_PERIOD_START = 0 // timestamp, when stakes are allowed
const POOL_CONTROLLER_SHARE = 0 // controller fee: 0-1000
const TOKEN_MINT_FEE = 0 // Ether required to buy this token
const TOKEN_RELEASE_TIME = 0 // timestamp, when token is awailable to redeem
let POOL_REWARD_RATE = new BN(`${1 * 10 ** 18}`).div(new BN(`${60 * 60 * 24}`)) // points per second

module.exports = async function (deployer, network, accounts) {
  const eddaNftsStake = await EddaNftStakeArtifact.deployed()

  if (network == 'fork') {
    TOKENS = TOKENS.reverse()
  }

  const createdPools = {}
  const createdTokens = {}
  for (let tokenIdx = 0; tokenIdx < TOKENS.length; tokenIdx++) {
    const token = TOKENS[tokenIdx]

    if ('collection' in token && token.collection) {
      const collectionId = token.collection.id
      if (!(collectionId in createdPools)) {
        await eddaNftsStake.createPool(
          token.collection.id,
          POOL_PERIOD_START,
          POOL_MAX_STAKE,
          POOL_REWARD_RATE,
          POOL_CONTROLLER_SHARE,
          accounts[0]
        )
        createdPools[collectionId] = { meta: token.collection }
      }

      // First "call" to get return value (truffle specific)
      const tokenPoints = new BN(`${parseInt(token.points) * 10 ** 18}`)
      const newTokenId = await eddaNftsStake.createCard.call(
        collectionId,
        token.maxSupply,
        tokenPoints,
        TOKEN_MINT_FEE,
        TOKEN_RELEASE_TIME
      )
      // Second call to execute chain changes (truffle specific)
      await eddaNftsStake.createCard(collectionId, token.maxSupply, tokenPoints, TOKEN_MINT_FEE, TOKEN_RELEASE_TIME)
      createdTokens[token.id] = { ...token, nftId: newTokenId.toString() }
    }
  }

  try {
    // 06 is number of migration script
    await fs.writeFile(`./deployed_collections_06.json`, JSON.stringify(createdPools, null, '  '))
    await fs.writeFile(`./deployed_tokens_06.json`, JSON.stringify(createdTokens, null, '  '))
  } catch (error) {
    console.error(error)
  }
}
