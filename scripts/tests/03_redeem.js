const EddaNftStakeArtifact = artifacts.require('EddaNftStake')
const EddaNftArtifact = artifacts.require('EddaNft')

module.exports = async (callback) => {
  try {
    const from = await web3.eth.getCoinbase()
    console.log(`Current account: ${from}`)

    const poolId = 1
    const cardId = 14
    let cardPoints

    const eddaNftsStake = await EddaNftStakeArtifact.deployed()
    const eddaNft = await EddaNftArtifact.deployed()

    console.log(`Redeem`)
    const tx = await eddaNftsStake.redeem(poolId, cardId)
    console.log(`tx:`, tx)

    console.log(`Get NFT (id=${cardId}) balance`)
    const balance = await eddaNft.balanceOf(from, cardId)
    console.log(`balance:`, balance.toString())
  } catch (e) {
    console.log(e)
    callback(e)
  }

  console.log('Done')
  callback()
}
