const getSizes = (artifact) => {
  return {
    bytecode: artifact.bytecode.length / 2 - 1,
    deployedBytecode: artifact.deployedBytecode.length / 2 - 1,
    recommendedDeployedBytecode: 2 ** 14 + 2 ** 13,
  }
}

module.exports = {
  getSizes,
}
