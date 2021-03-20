const EddaNftArtifact = artifacts.require('EddaNft')
const EddaNftStakeArtifact = artifacts.require('EddaNftStake')

module.exports = async function (deployer, network, accounts) {
  const beforeDeployerBalanceETH = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]))
  console.log(`beforeDeployerBalanceETH`, beforeDeployerBalanceETH)

  const nfts = await EddaNftArtifact.deployed()
  const eddaNftsStake = await EddaNftStakeArtifact.deployed()

  await nfts.addWhitelistAdmin(await eddaNftsStake.address)
  await nfts.addMinter(await eddaNftsStake.address)

  afterDeployerBalanceETH = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]))
  console.log(`afterDeployerBalanceETH`, afterDeployerBalanceETH)

  deployerSpent = beforeDeployerBalanceETH - afterDeployerBalanceETH
  console.log(`deployerSpent`, deployerSpent)
}
