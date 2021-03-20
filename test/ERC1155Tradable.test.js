const env = require('../scripts/env')
if (env.ETHEREUM_RPC_URL) {
  console.log(`Using RPC from env: ${env.ETHEREUM_RPC_URL}`)
  require('@openzeppelin/test-helpers/configure')({ provider: env.ETHEREUM_RPC_URL })
} else {
  console.log(`\nUsing internal truffle network. PLEASE, stop ANY OTHER PRC on port 8545.\n`)
}

const { BN, expectRevert, time } = require('@openzeppelin/test-helpers')

const ERC1155TradableArtifact = artifacts.require('ERC1155Tradable')

contract('ERC1155Tradable', function (accounts) {
  const [deployer, user] = accounts

  // Constructors
  const construct = async function (containerObj) {
    containerObj.nftsContract = await ERC1155TradableArtifact.new(
      'My Nfts',
      'NFTS',
      '0x0000000000000000000000000000000000000000',
      { from: deployer }
    )
  }

  describe('updateTokenMaxSupply', async function () {
    before(async function () {
      await construct(this)

      this.tokenId = 0
      this.maxSupply = 100
      this.initialSupply = new BN(`50`)
    })

    it('create token', async function () {
      const uri = ''
      const data = []
      this.tokenId = await this.nftsContract.create.call(this.maxSupply, this.initialSupply, uri, data)
      await this.nftsContract.create(this.maxSupply, this.initialSupply, uri, data)
    })

    it('no token', async function () {
      await expectRevert(
        this.nftsContract.updateTokenMaxSupply(this.tokenId + 1, this.initialSupply),
        'ERC1155Tradable#updateTokenMaxSupply: NONEXISTENT_TOKEN'
      )
    })

    it('low new value', async function () {
      await expectRevert(
        this.nftsContract.updateTokenMaxSupply(this.tokenId, this.initialSupply.sub(new BN(`1`))),
        'already minted > new maxSupply'
      )
    })

    it('equal or greater new value', async function () {
      const maxSupplyBefore = await this.nftsContract.maxSupply(this.tokenId)
      await this.nftsContract.updateTokenMaxSupply(this.tokenId, this.initialSupply.add(new BN(`1`)))
      await this.nftsContract.updateTokenMaxSupply(this.tokenId, this.initialSupply)
      const maxSupplyAfter = await this.nftsContract.maxSupply(this.tokenId)
      assert.equal(maxSupplyAfter.toString(), this.initialSupply.toString(), 'Wrong maxSupply value')
      assert.isFalse(maxSupplyAfter.eq(maxSupplyBefore), 'Value of maxSupply not changed')
    })
  })

  describe('mint', async function () {
    before(async function () {
      await construct(this)

      this.tokenId = 0
      this.maxSupply = 100
      this.initialSupply = new BN(`50`)
    })

    it('create token', async function () {
      const uri = ''
      const data = []
      this.tokenId = await this.nftsContract.create.call(this.maxSupply, this.initialSupply, uri, data)
      await this.nftsContract.create(this.maxSupply, this.initialSupply, uri, data)
    })

    it('quantity exeeds max supply: revert', async function () {
      const tokenSupply = await this.nftsContract.tokenSupply(this.tokenId)
      const tokenMaxSupply = await this.nftsContract.tokenMaxSupply(this.tokenId)
      const quantity = tokenMaxSupply.sub(tokenSupply).add(new BN(`1`))
      await expectRevert(this.nftsContract.mint(deployer, this.tokenId, quantity, []), `Max supply reached`)
    })

    it('quantity not exeeds max supply: pass', async function () {
      const tokenSupply = await this.nftsContract.tokenSupply(this.tokenId)
      const tokenMaxSupply = await this.nftsContract.tokenMaxSupply(this.tokenId)
      const quantity = tokenMaxSupply.sub(tokenSupply)
      await this.nftsContract.mint(deployer, this.tokenId, quantity, [])
    })
  })
})
