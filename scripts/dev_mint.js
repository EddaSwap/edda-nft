const ENV = require('../scripts/env.js')
const { BN, ether } = require('@openzeppelin/test-helpers')
// const web3 = require('web3')

const GENESIS_POOL = 1
const MAX_STAKE = 5 * 10 ** 18
const REWARD_RATE = 1 * 10 ** 18

// EDDA
const eddaABI = require('./abiEDDA.js')
const eddaCon = ENV.EDDA_TOKEN_ADDRESS
const eddaUnl = ENV.EDDAHolder
const EDDA = new web3.eth.Contract(eddaABI, eddaCon)

const EddaNftArtifact = artifacts.require('EddaNft')
const EddaNftStakeArtifact = artifacts.require('EddaNftStake')

const transferUnlocked = async (id, token, unlocked, recipient, amount = ether('1')) => {
  console.log(`transferUnlocked: `, id, unlocked, recipient)
  const dumpBalances = async () => {
    const [unlockedBalance, recipientBalance] = await Promise.all([
      await token.methods.balanceOf(unlocked).call(),
      await token.methods.balanceOf(recipient).call(),
    ])
    console.log(`  [${id}] Balance unlocked: ${unlockedBalance}`)
    console.log(`  [${id}] Balance recipient: ${recipientBalance}`)
  }
  await dumpBalances()
  try {
    await token.methods.transfer(recipient, amount.toString()).send({ from: unlocked, gasLimit: 800000 })

    console.log(`  [${id}] transfered (${amount}) to ${recipient}`)
  } catch (e) {
    console.error(`  [${id}] NOT transfered (${amount}) to ${recipient}`, e)
  }

  await dumpBalances()
}

module.exports = async (callback) => {
  try {
    const currAccount = await web3.eth.getCoinbase()
    console.log(`Coinbase = ${currAccount}`)

    const eddaNftsStake = await EddaNftStakeArtifact.deployed()
    const nfts = await EddaNftArtifact.deployed()

    const pools = [
      {
        id: 3,
        tokens: [
          { id: 8, supply: 1, points: 30 },
          { id: 9, supply: 1, points: 30 },
        ],
      },
    ]

    console.log(`Create pools`)
    for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
      const pool = pools[poolIdx]
      console.log(`Create pool ${poolIdx} with id ${pool.id}`)
      await eddaNftsStake.createPool(
        pool.id, // uint256 id,
        0, // uint256 periodStart,
        new BN(`${MAX_STAKE}`), // uint256 maxStake,
        new BN(`${REWARD_RATE}`).div(new BN(`${60 * 60}`)), // uint256 rewardRate,
        0, // uint256 controllerShare,
        currAccount // address artist
      )

      const tokens = pool.tokens
      for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
        const token = tokens[tokenIdx]
        console.log(`Create token ${tokenIdx} which will have id ${token.id}`)

        // First "call" to get return value (truffle specific)
        const tokenId = await nfts.create.call(token.supply, 0, '', web3.utils.fromAscii(''))
        // Second call to execute chain changes (truffle specific)
        await nfts.create(token.supply, 0, '', web3.utils.fromAscii(''))

        console.log(`Add card`)
        // function addCard(
        //   uint256 pool,
        //   uint256 id,
        //   uint256 points,
        //   uint256 mintFee,
        //   uint256 releaseTime
        await eddaNftsStake.addCard(pool.id, token.id, new BN(`${token.points * 10 ** 18}`), 0, 0)
      }
    }

    console.log(`Mint some EDDA`)
    await web3.eth.sendTransaction({ from: currAccount, to: eddaUnl, value: ether('10') })
    await transferUnlocked('EDDA', EDDA, eddaUnl, currAccount, ether('10'))
    console.log('+ EDDA minted OK!')
    console.log('---------------------------------')

    console.log(`EDDA balance request`)
    const eddaBalance = await EDDA.methods.balanceOf(currAccount).call()
    console.log(`Current EDDA balance:`, eddaBalance)
    console.log(`Approve`)
    await EDDA.methods.approve(await eddaNftsStake.address, new BN(`${5 * 10 ** 18}`)).send({ from: currAccount })
    console.log(`Stake`)
    await eddaNftsStake.stake(GENESIS_POOL, new BN(`${5 * 10 ** 18}`))

    console.log(`Assign test Points`)
    await eddaNftsStake.assignPointsTo(GENESIS_POOL, currAccount, new BN(`${10 ** 18}`).mul(new BN(`10000`)))

    console.log(`Mint NFT for user`)
    await nfts.mint(
      currAccount, //address _to,
      1, //uint256 _id,
      2, //uint256 _quantity,
      web3.utils.fromAscii('') //bytes memory _data
    )
  } catch (e) {
    console.log(e)
    callback(e)
  }

  console.log('Done')
  callback()
}
