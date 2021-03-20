const MigrationsArtifact = artifacts.require('Migrations')

module.exports = async function (deployer) {
  await deployer.deploy(MigrationsArtifact)
}
