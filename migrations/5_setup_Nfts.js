const EddaNftArtifact = artifacts.require('EddaNft')
const EddaNftStakeArtifact = artifacts.require('EddaNftStake')

module.exports = async function (deployer, network, accounts) {
  const nfts = await EddaNftArtifact.deployed()
  const eddaNftsStake = await EddaNftStakeArtifact.deployed()

  await nfts.addWhitelistAdmin(await eddaNftsStake.address)
  await nfts.addMinter(await eddaNftsStake.address)
}
