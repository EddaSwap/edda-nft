const ENV = require('../scripts/env.js')

const EDDAArtifact = artifacts.require('EDDA')

module.exports = async function (deployer) {
  if (ENV.DEPLOY_FAKE_CONTRACTS) {
    await deployer.deploy(EDDAArtifact)
  }
}
