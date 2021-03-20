const EddaNftStakeArtifact = artifacts.require('EddaNftStake')

module.exports = async (callback) => {
  try {
    const from = await web3.eth.getCoinbase()
    console.log(`Current account: ${from}`)

    const eddaNftsStake = await EddaNftStakeArtifact.deployed()
    const poolId = 1

    const earned = await eddaNftsStake.earned(from, poolId)
    console.log(new Date(), `earned ${earned.toString()} wei OR ${web3.utils.fromWei(earned)} * 10^18`)
  } catch (e) {
    console.log(e)
    callback(e)
  }

  console.log('Done')
  callback()
}
