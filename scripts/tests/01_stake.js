const ENV = require('../env.js')

const { BN } = require('@openzeppelin/test-helpers')

const EddaNftStakeArtifact = artifacts.require('EddaNftStake')
const EddaArtifact = artifacts.require('EDDA')

module.exports = async (callback) => {
  try {
    const from = await web3.eth.getCoinbase()
    console.log(`Current account: ${from}`)

    const eddaNftsStake = await EddaNftStakeArtifact.deployed()
    const edda = await EddaArtifact.at(ENV.EDDA_TOKEN_ADDRESS)

    const amount = new BN(`${1 * 10 ** 18}`)

    console.log(`Approve`)
    await edda.approve(await eddaNftsStake.address, amount, { from })

    console.log(`Stake`)
    const tx = await eddaNftsStake.stake(
      1, // poolId == collection.id from deployed_tokens_06.json
      amount, // amount
      { from }
    )
    console.log(`tx:`, tx)
  } catch (e) {
    console.log(e)
    callback(e)
  }

  console.log('Done')
  callback()
}
