const fs = require('fs').promises
const { argv } = require('yargs')

const tokens1 = require('../deployed_tokens_06.json')

const combineContracts = async () => {
  try {
    const artifacts = {}
    const files = await fs.readdir(argv.srcPath)
    files.forEach((file) => {
      const contractName = file.replace(/\.json$/, '')
      const { abi, networks } = require(`${argv.srcPath}/${file}`)
      artifacts[contractName] = { abi, networks }
    })
    await fs.writeFile(`${argv.tgtPath}/${argv.contractsFileName}`, JSON.stringify(artifacts, null, '  '))
  } catch (error) {
    console.error(error)
  }
}

const combineNftCollection1 = async () => {
  try {
    const result = []
    for (const [key, token] of Object.entries(tokens1)) {
      const collection = token.collection
      result.push({
        id: token.nftId,
        name: token.name,
        image: token.image,
        description: token.description,
        pool: { name: collection.name, id: collection.id },
      })
    }
    await fs.writeFile(`${argv.tgtPath}/${argv.nftCollection1Name}`, JSON.stringify(result, null, '  '))
  } catch (error) {
    console.error(error)
  }
}

const main = async () => {
  await combineContracts()
  await combineNftCollection1()
}

main()
