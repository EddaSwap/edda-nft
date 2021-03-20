const env = require('../scripts/env')
if (env.ETHEREUM_RPC_URL) {
  console.log(`Using RPC from env: ${env.ETHEREUM_RPC_URL}`)
  require('@openzeppelin/test-helpers/configure')({ provider: env.ETHEREUM_RPC_URL })
} else {
  console.log(`\nUsing internal truffle network. PLEASE, stop ANY OTHER PRC on port 8545.\n`)
}

const { BN, expectRevert, time } = require('@openzeppelin/test-helpers')

const PoolTokenWrapperArtifact = artifacts.require('PoolTokenWrapper')
const EDDAArtifact = artifacts.require('EDDA')

contract('PoolTokenWrapper', function (accounts) {
  const [deployer, user] = accounts

  // Constructors
  const construct = async function (containerObj) {
    containerObj.eddaContract = await EDDAArtifact.new({ from: deployer })
    containerObj.tokenWrapperContract = await PoolTokenWrapperArtifact.new(await containerObj.eddaContract.address, {
      from: deployer,
    })

    await containerObj.eddaContract.mint(deployer, new BN(`${100 * 10 ** 18}`), { from: deployer })
  }

  describe('safe transfers', async function () {
    before(async function () {
      await construct(this)

      this.poolId = 0
      this.targetPoolId = 1
      this.amount = new BN(`100`)
    })

    it('stake', async function () {
      const userBalanceBefore = await this.eddaContract.balanceOf(deployer)
      const contractBalanceBefore = await this.eddaContract.balanceOf(await this.tokenWrapperContract.address)

      await this.eddaContract.approve(await this.tokenWrapperContract.address, this.amount, { from: deployer })
      await this.tokenWrapperContract.stake(this.poolId, this.amount)

      const userBalanceAfter = await this.eddaContract.balanceOf(deployer)
      const contractBalanceAfter = await this.eddaContract.balanceOf(await this.tokenWrapperContract.address)

      assert.equal(userBalanceBefore.sub(this.amount).toString(), userBalanceAfter.toString(), 'Wrong user balance')
      assert.equal(
        contractBalanceBefore.add(this.amount).toString(),
        contractBalanceAfter.toString(),
        'Wrong contract balance'
      )
    })

    it('withdraw', async function () {
      const userBalanceBefore = await this.eddaContract.balanceOf(deployer)
      const contractBalanceBefore = await this.eddaContract.balanceOf(await this.tokenWrapperContract.address)

      await this.tokenWrapperContract.withdraw(this.poolId, this.amount)

      const userBalanceAfter = await this.eddaContract.balanceOf(deployer)
      const contractBalanceAfter = await this.eddaContract.balanceOf(await this.tokenWrapperContract.address)

      assert.equal(userBalanceBefore.add(this.amount).toString(), userBalanceAfter.toString(), 'Wrong user balance')
      assert.equal(
        contractBalanceBefore.sub(this.amount).toString(),
        contractBalanceAfter.toString(),
        'Wrong contract balance'
      )
    })
  })
})
