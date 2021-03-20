const ENV = require('../scripts/env.js')

const EddaNftArtifact = artifacts.require('EddaNft')

module.exports = async function (deployer) {
  await deployer.deploy(
    EddaNftArtifact,
    ENV.EDDA_NFTS_CONTRACT_NAME,
    ENV.EDDA_NFTS_CONTRACT_SYMBOL,
    ENV.EDDA_NFTS_PROXY_REGISTRY_ADDRESS,
    ENV.EDDA_NFTS_BASE_METADATA_URI,
    ENV.EDDA_NFTS_CONTRACT_URI
  )
}
