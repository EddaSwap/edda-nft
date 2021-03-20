const ENV = require('../env.js')

const EddaNftStakeArtifact = artifacts.require('EddaNftStake')
const EddaArtifact = artifacts.require('EDDA')

module.exports = async (callback) => {
  try {
    const from = await web3.eth.getCoinbase()
    console.log(`Current account: ${from}`)

    const poolId = 1

    const eddaNftsStake = await EddaNftStakeArtifact.deployed()
    const edda = await EddaArtifact.at(ENV.EDDA_TOKEN_ADDRESS)

    let eddaBalance = await edda.balanceOf(from)
    console.log(`User EDDA balance ${eddaBalance} wei OR ${web3.utils.fromWei(eddaBalance)} * 10^18`)

    let userBalanceInPool = await eddaNftsStake.balanceOf(from, poolId)

    console.log(`Withdraw:`, userBalanceInPool.toString())
    const tx = await eddaNftsStake.withdraw(poolId, userBalanceInPool)
    console.log(`tx:`, tx)

    eddaBalance = await edda.balanceOf(from)
    console.log(`User EDDA balance ${eddaBalance} wei OR ${web3.utils.fromWei(eddaBalance)} * 10^18`)
  } catch (e) {
    console.log(e)
    callback(e)
  }

  console.log('Done')
  callback()
}
