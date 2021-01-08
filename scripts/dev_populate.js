const { ether } = require('@openzeppelin/test-helpers')

module.exports = async (callback) => {
  try {
    const currAccount = await web3.eth.getCoinbase()
  } catch (e) {
    console.log(e)
    callback(e)
  }

  console.log('Done')
  callback()
}
