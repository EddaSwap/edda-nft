const ENV = require('../scripts/env.js')

const EddaNftArtifact = artifacts.require('EddaNft')
const EddaNftStakeArtifact = artifacts.require('EddaNftStake')

const TokenArtifact = artifacts.require('EDDA')

module.exports = async function (deployer, network, accounts) {
  const beforeDeployerBalanceETH = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]))
  console.log(`beforeDeployerBalanceETH`, beforeDeployerBalanceETH)

  const nfts = await EddaNftArtifact.deployed()
  let tokenAddress = ENV.EDDA_TOKEN_ADDRESS
  console.log(`tokenAddress ${tokenAddress}`)
  if (ENV.DEPLOY_FAKE_CONTRACTS) {
    console.log(`ENV.DEPLOY_FAKE_CONTRACTS ${ENV.DEPLOY_FAKE_CONTRACTS}`)
    const token = await TokenArtifact.deployed()
    tokenAddress = await token.address
  }
  console.log(`tokenAddress ${tokenAddress}`)
  await deployer.deploy(EddaNftStakeArtifact, accounts[0], await nfts.address, tokenAddress)

  afterDeployerBalanceETH = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]))
  console.log(`afterDeployerBalanceETH`, afterDeployerBalanceETH)

  deployerSpent = beforeDeployerBalanceETH - afterDeployerBalanceETH
  console.log(`deployerSpent`, deployerSpent)
}
