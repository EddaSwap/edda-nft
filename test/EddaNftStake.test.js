const env = require('../scripts/env')
if (env.ETHEREUM_RPC_URL) {
  console.log(`Using RPC from env: ${env.ETHEREUM_RPC_URL}`)
  require('@openzeppelin/test-helpers/configure')({ provider: env.ETHEREUM_RPC_URL })
} else {
  console.log(`\nUsing internal truffle network. PLEASE, stop ANY OTHER PRC on port 8545.\n`)
}

const { BN, expectRevert, time } = require('@openzeppelin/test-helpers')

const EddaNftStakeArtifact = artifacts.require('EddaNftStake')
const EddaNftArtifact = artifacts.require('EddaNft')
const EDDAArtifact = artifacts.require('EDDA')

contract('EddaNftStake', function (accounts) {
  const [deployer, user] = accounts

  // Constructors
  const construct = async function (containerObj) {
    containerObj.nftsContract = await EddaNftArtifact.new(
      'My Nfts',
      'NFTS',
      '0x0000000000000000000000000000000000000000',
      'https://nft.host.com/api/',
      'https://nft.host.com/contract/',
      { from: deployer }
    )
    containerObj.eddaContract = await EDDAArtifact.new({ from: deployer })
    containerObj.stakeContract = await EddaNftStakeArtifact.new(
      deployer,
      await containerObj.nftsContract.address,
      await containerObj.eddaContract.address,
      { from: deployer }
    )

    await containerObj.eddaContract.mint(deployer, new BN(`${10 * 10 ** 18}`), { from: deployer })
    await containerObj.nftsContract.addWhitelistAdmin(await containerObj.stakeContract.address, { from: deployer })
    await containerObj.nftsContract.addMinter(await containerObj.stakeContract.address, { from: deployer })
  }

  describe('Simple scenario', async function () {
    before(async function () {
      await construct(this)

      this.poolId = 1
      this.cardId = 0
    })

    it('createPool', async function () {
      await this.stakeContract.createPool(
        this.poolId, // uint256 id,
        0, // uint256 periodStart,
        new BN(`${5 * 10 ** 18}`), // uint256 maxStake,
        new BN(`${1 * 10 ** 18}`).div(new BN(`${60 * 60 * 24}`)), // uint256 rewardRate,
        0, // uint256 controllerShare,
        deployer, // address artist
        { from: deployer }
      )
    })

    it('createCard', async function () {
      // First "call" to get return value (truffle specific)
      this.cardId = await this.stakeContract.createCard.call(
        this.poolId, //uint256 pool,
        100, // uint256 supply,
        new BN(`${4 * 10 ** 18}`), // uint256 points,
        0, // uint256 mintFee,
        0, // uint256 releaseTime
        { from: deployer }
      )
      // Second call to execute chain changes (truffle specific)
      await this.stakeContract.createCard(
        this.poolId, //uint256 pool,
        100, // uint256 supply,
        new BN(`${4 * 10 ** 18}`), // uint256 points,
        0, // uint256 mintFee,
        0, // uint256 releaseTime
        { from: deployer }
      )
    })

    it('approve', async function () {
      await this.eddaContract.approve(await this.stakeContract.address, new BN(`${5 * 10 ** 18}`), { from: deployer })
    })

    it('stake', async function () {
      await this.stakeContract.stake(
        this.poolId, // uint256 pool,
        new BN(`${5 * 10 ** 18}`), // uint256 amount
        { from: deployer }
      )
    })

    it('time shift', async function () {
      const runTimestamp = await time.latest()
      const newEVMTime = runTimestamp.add(new BN(`${60 * 60 * 24 * 1.5}`)) // 2 day
      await time.increaseTo(newEVMTime)

      const earned = await this.stakeContract.earned(deployer, this.poolId)
    })

    it('redeem', async function () {
      await this.stakeContract.redeem(this.poolId, this.cardId)
    })

    it('check NFT balance', async function () {
      const balance = await this.nftsContract.balanceOf(deployer, this.cardId)
      expect(balance > 0)
    })
  })

  describe('updateCardPoints', async function () {
    before(async function () {
      await construct(this)

      this.poolId = 1
      this.cardId = 0
    })

    it('createPool', async function () {
      await this.stakeContract.createPool(
        this.poolId,
        0,
        new BN(`${5 * 10 ** 18}`),
        new BN(`${1 * 10 ** 18}`).div(new BN(`${60 * 60 * 24}`)),
        0,
        deployer,
        { from: deployer }
      )
    })

    it('createCard', async function () {
      this.cardId = await this.stakeContract.createCard.call(this.poolId, 100, new BN(`${4 * 10 ** 18}`), 0, 0, {
        from: deployer,
      })
      await this.stakeContract.createCard(this.poolId, 100, new BN(`${4 * 10 ** 18}`), 0, 0, { from: deployer })
    })

    it('not owner', async function () {
      await expectRevert(
        this.stakeContract.updateCardPoints(this.poolId, this.cardId, 0, { from: user }),
        'Ownable: caller is not the owner'
      )
    })

    it('no pool', async function () {
      await expectRevert(
        this.stakeContract.updateCardPoints(this.poolId + 1, this.cardId, 0, { from: deployer }),
        'pool does not exists'
      )
    })

    it('no card', async function () {
      await expectRevert(
        this.stakeContract.updateCardPoints(this.poolId, this.cardId + 1, 0, { from: deployer }),
        'card does not exists'
      )
    })

    it('pass', async function () {
      const newCardPoints = new BN(`${10 * 10 ** 18}`)
      const cardPointsBefore = await this.stakeContract.cardPoints(this.poolId, this.cardId)
      this.stakeContract.updateCardPoints(this.poolId, this.cardId, newCardPoints, { from: deployer })
      const cardPointsAfter = await this.stakeContract.cardPoints(this.poolId, this.cardId)
      assert.equal(cardPointsAfter.toString(), newCardPoints.toString(), 'Wrong card points value')
      assert.isFalse(cardPointsAfter.eq(cardPointsBefore), 'Value of points not changed')
    })
  })
})
