const env = require('../scripts/env')
if (env.ETHEREUM_RPC_URL) {
  console.log(`Using RPC from env: ${env.ETHEREUM_RPC_URL}`)
  require('@openzeppelin/test-helpers/configure')({ provider: env.ETHEREUM_RPC_URL })
} else {
  console.log(`\nUsing internal truffle network. PLEASE, stop ANY OTHER PRC on port 8545.\n`)
}

const { BN, expectRevert, time, constants } = require('@openzeppelin/test-helpers')

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

  describe('rescuePoints', async function () {
    before(async function () {
      await construct(this)

      this.poolId = 1
      this.points = 5
      this.amount = new BN(`${5 * 10 ** 18}`)
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

    it('rescuePoints', async function () {
      await this.eddaContract.approve(await this.stakeContract.address, this.amount)
      await this.stakeContract.stake(this.poolId, this.amount)
      await this.stakeContract.assignPointsTo(this.poolId, deployer, this.points)
      await this.stakeContract.setRescuer(deployer)

      const userBalanceBefore = await this.eddaContract.balanceOf(deployer)
      const contractBalanceBefore = await this.eddaContract.balanceOf(await this.stakeContract.address)

      // First call to get value: truffle specific
      const rescuedPoints = await this.stakeContract.rescuePoints.call(deployer, this.poolId)
      // Second call: real execute
      await this.stakeContract.rescuePoints(deployer, this.poolId)

      assert.equal(rescuedPoints.toString(), this.points, 'Wrong points amount rescued')

      const userBalanceAfter = await this.eddaContract.balanceOf(deployer)
      const contractBalanceAfter = await this.eddaContract.balanceOf(await this.stakeContract.address)

      assert.equal(userBalanceBefore.add(this.amount).toString(), userBalanceAfter.toString(), 'Wrong user balance')
      assert.equal(
        contractBalanceBefore.sub(this.amount).toString(),
        contractBalanceAfter.toString(),
        'Wrong contract balance'
      )
    })
  })

  describe('artist', async function () {
    before(async function () {
      await construct(this)

      this.poolId = 1
      this.cardId = 0
      this.cardPoints = new BN(`${4 * 10 ** 18}`)
      this.cardMintFee = new BN(`${1 * 10 ** 18}`)
      this.artist = user
    })

    it('createPool zero-address artist: fails', async function () {
      await expectRevert(
        this.stakeContract.createPool(
          this.poolId,
          0,
          new BN(`${5 * 10 ** 18}`),
          new BN(`${1 * 10 ** 18}`).div(new BN(`${60 * 60 * 24}`)),
          0,
          constants.ZERO_ADDRESS,
          { from: deployer }
        ),
        `Invalid artist`
      )
    })

    it('createPool', async function () {
      await this.stakeContract.createPool(
        this.poolId,
        0,
        new BN(`${5 * 10 ** 18}`),
        new BN(`${1 * 10 ** 18}`).div(new BN(`${60 * 60 * 24}`)),
        0,
        this.artist,
        { from: deployer }
      )
    })

    it('createCard', async function () {
      this.cardId = await this.stakeContract.createCard.call(this.poolId, 100, this.cardPoints, this.cardMintFee, 0, {
        from: deployer,
      })
      await this.stakeContract.createCard(this.poolId, 100, this.cardPoints, this.cardMintFee, 0, { from: deployer })
    })

    it('redeem', async function () {
      await this.stakeContract.assignPointsTo(this.poolId, deployer, this.cardPoints)
      await this.stakeContract.redeem(this.poolId, this.cardId, { value: this.cardMintFee })
    })

    it('setArtist: zero address fail', async function () {
      await expectRevert(this.stakeContract.setArtist(this.poolId, constants.ZERO_ADDRESS), 'Invalid artist')
    })

    it('setArtist', async function () {
      const oldPoolInfo = await this.stakeContract.pools(this.poolId)
      const oldArtistPendingWithdrawalsBefore = await this.stakeContract.pendingWithdrawals(this.artist)
      const newArtistPendingWithdrawalsBefore = await this.stakeContract.pendingWithdrawals(deployer)

      await this.stakeContract.setArtist(this.poolId, deployer)

      const newPoolInfo = await this.stakeContract.pools(this.poolId)
      assert.notEqual(oldPoolInfo.artist, newPoolInfo.artist, `Artist has not been changed`)
      assert.equal(newPoolInfo.artist, deployer, `New artist wrong`)

      const oldArtistPendingWithdrawalsAfter = await this.stakeContract.pendingWithdrawals(this.artist)
      const newArtistPendingWithdrawalsAfter = await this.stakeContract.pendingWithdrawals(deployer)

      assert.equal(oldArtistPendingWithdrawalsAfter.toString(), '0', `Wrong old artist withdrawals`)

      const diff = oldArtistPendingWithdrawalsBefore.sub(oldArtistPendingWithdrawalsAfter)
      assert.equal(
        newArtistPendingWithdrawalsAfter.toString(),
        newArtistPendingWithdrawalsBefore.add(diff).toString(),
        `Wrong new artist withdrawals`
      )
    })
  })

  describe('controller', async function () {
    before(async function () {
      await construct(this)

      this.poolId = 1
      this.cardId = 0
      this.cardPoints = new BN(`${4 * 10 ** 18}`)
      this.cardMintFee = new BN(`${1 * 10 ** 18}`)
      this.artist = user
    })

    it('createPool', async function () {
      await this.stakeContract.createPool(
        this.poolId,
        0,
        new BN(`${5 * 10 ** 18}`),
        new BN(`${1 * 10 ** 18}`).div(new BN(`${60 * 60 * 24}`)),
        500,
        this.artist,
        { from: deployer }
      )
    })

    it('createCard', async function () {
      this.cardId = await this.stakeContract.createCard.call(this.poolId, 100, this.cardPoints, this.cardMintFee, 0, {
        from: deployer,
      })
      await this.stakeContract.createCard(this.poolId, 100, this.cardPoints, this.cardMintFee, 0, { from: deployer })
    })

    it('redeem', async function () {
      await this.stakeContract.assignPointsTo(this.poolId, deployer, this.cardPoints)
      await this.stakeContract.redeem(this.poolId, this.cardId, { value: this.cardMintFee })
    })

    it('setController: zero address fail', async function () {
      await expectRevert(this.stakeContract.setController(constants.ZERO_ADDRESS), 'Invalid controller')
    })

    it('setController', async function () {
      const oldControllerPendingWithdrawalsBefore = await this.stakeContract.pendingWithdrawals(deployer)
      const newControllerPendingWithdrawalsBefore = await this.stakeContract.pendingWithdrawals(user)

      await this.stakeContract.setController(user)

      const newController = await this.stakeContract.controller()
      assert.equal(newController, user, `Wrong new controller`)

      const oldControllerPendingWithdrawalsAfter = await this.stakeContract.pendingWithdrawals(deployer)
      const newControllerPendingWithdrawalsAfter = await this.stakeContract.pendingWithdrawals(user)

      assert.equal(oldControllerPendingWithdrawalsAfter.toString(), '0', `Wrong old controller withdrawals`)

      const diff = oldControllerPendingWithdrawalsBefore.sub(oldControllerPendingWithdrawalsAfter)
      assert.equal(
        newControllerPendingWithdrawalsAfter.toString(),
        newControllerPendingWithdrawalsBefore.add(diff).toString(),
        `Wrong new controller withdrawals`
      )
    })

    it('Controller in constructor: zero address fails', async function () {
      await expectRevert(
        EddaNftStakeArtifact.new(
          constants.ZERO_ADDRESS,
          await this.nftsContract.address,
          await this.eddaContract.address,
          { from: deployer }
        ),
        `Invalid controller`
      )
    })
  })

  describe('controllerShare', async function () {
    before(async function () {
      await construct(this)

      this.poolId = 1
      this.cardId = 0
      this.cardPoints = new BN(`${4 * 10 ** 18}`)
      this.cardMintFee = new BN(`${1 * 10 ** 18}`)
      this.artist = user
    })

    it('createPool: share > max: fail', async function () {
      const maxControllerShare = await this.stakeContract.MAX_CONTROLLER_SHARE()
      await expectRevert(
        this.stakeContract.createPool(
          this.poolId,
          0,
          new BN(`${5 * 10 ** 18}`),
          new BN(`${1 * 10 ** 18}`).div(new BN(`${60 * 60 * 24}`)),
          maxControllerShare.add(new BN(`1`)),
          this.artist,
          { from: deployer }
        ),
        `Incorrect controller share`
      )
    })

    it('createPool: share == max: pass', async function () {
      const maxControllerShare = await this.stakeContract.MAX_CONTROLLER_SHARE()
      await this.stakeContract.createPool(
        this.poolId,
        0,
        new BN(`${5 * 10 ** 18}`),
        new BN(`${1 * 10 ** 18}`).div(new BN(`${60 * 60 * 24}`)),
        maxControllerShare,
        this.artist,
        { from: deployer }
      )
    })

    it('setControllerShare: share > max: fail', async function () {
      const maxControllerShare = await this.stakeContract.MAX_CONTROLLER_SHARE()
      await expectRevert(
        this.stakeContract.setControllerShare(this.poolId, maxControllerShare.add(new BN(`1`)), { from: deployer }),
        `Incorrect controller share`
      )
    })

    it('setControllerShare: share == max: pass', async function () {
      const maxControllerShare = await this.stakeContract.MAX_CONTROLLER_SHARE()
      await this.stakeContract.setControllerShare(this.poolId, maxControllerShare, { from: deployer })
    })
  })

  describe('createPool', async function () {
    before(async function () {
      await construct(this)

      this.poolId = 1
      this.cardId = 0
      this.cardPoints = new BN(`${4 * 10 ** 18}`)
      this.cardMintFee = new BN(`${1 * 10 ** 18}`)
      this.artist = user
    })

    it('zero rewardRate: fail', async function () {
      const maxControllerShare = await this.stakeContract.MAX_CONTROLLER_SHARE()
      await expectRevert(
        this.stakeContract.createPool(this.poolId, 0, new BN(`${5 * 10 ** 18}`), 0, maxControllerShare, this.artist, {
          from: deployer,
        }),
        `Invalid rewardRate`
      )
    })
  })

  describe('1 day, check hourly', async function () {
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

    it('approve and stake', async function () {
      await this.eddaContract.approve(await this.stakeContract.address, new BN(`${5 * 10 ** 18}`), { from: deployer })
      await this.stakeContract.stake(
        this.poolId, // uint256 pool,
        new BN(`${1 * 10 ** 18}`), // uint256 amount
        { from: deployer }
      )
    })

    it('check earned hourly', async function () {
      let hoursPast = 0
      const startTime = await time.latest()
      while (hoursPast <= 24) {
        //time shift
        const newEVMTime = startTime.add(new BN(`${60 * 60 * hoursPast}`))
        await time.increaseTo(newEVMTime)

        //check earned
        const earned = await this.stakeContract.earned(deployer, this.poolId)
        console.log(`Hours past: ${hoursPast}, earned: ${earned} wei OR ${web3.utils.fromWei(earned)} * 10^18`)

        hoursPast += 1
      }
    })
  })

  describe('points', async function () {
    before(async function () {
      await construct(this)

      this.poolId = 1
      this.cardId = 2
      this.artist = user
    })

    it('createPool', async function () {
      await this.stakeContract.createPool(
        this.poolId,
        0,
        new BN(`${1 * 10 ** 18}`),
        new BN(`${1 * 10 ** 18}`).div(new BN(`${60 * 60 * 24}`)),
        0,
        this.artist,
        { from: deployer }
      )
    })

    it('createCard: points==0: fail', async function () {
      await expectRevert(
        this.stakeContract.createCard(this.poolId, 100, 0, 0, 0, { from: deployer }),
        `Points too small`
      )
    })

    it('createCard: points==1e18: pass', async function () {
      await this.stakeContract.createCard(this.poolId, 100, new BN(`${1e18}`), 0, 0, { from: deployer })
    })

    it('addCard: points==0: fail', async function () {
      await expectRevert(
        this.stakeContract.addCard(this.poolId, this.cardId, 0, 0, 0, { from: deployer }),
        `Points too small`
      )
    })

    it('addCard: points==1e18: pass', async function () {
      await this.stakeContract.addCard(this.poolId, this.cardId, new BN(`${1e18}`), 0, 0, { from: deployer })
    })

    it('updateCardPoints: points==0: fail', async function () {
      await expectRevert(
        this.stakeContract.updateCardPoints(this.poolId, this.cardId, 0, { from: deployer }),
        `Points too small`
      )
    })

    it('updateCardPoints: points==1e18: pass', async function () {
      await this.stakeContract.updateCardPoints(this.poolId, this.cardId, new BN(`${1e18}`), { from: deployer })
    })

    it('check card points', async function () {
      const cardPoints = await this.stakeContract.cardPoints(this.poolId, this.cardId)
      assert.equal(cardPoints.toString(), new BN(`${1e18}`).toString(), 'Wrong card points value')
    })
  })

  describe('nonReentrant', async function () {
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

    it('approve and stake', async function () {
      await this.eddaContract.approve(await this.stakeContract.address, new BN(`${5 * 10 ** 18}`), { from: deployer })
      await this.stakeContract.stake(
        this.poolId, // uint256 pool,
        new BN(`${1 * 10 ** 18}`), // uint256 amount
        { from: deployer }
      )
    })

    it('exit should pass', async function () {
      await this.stakeContract.exit(this.poolId, { from: deployer })
    })
  })
})
