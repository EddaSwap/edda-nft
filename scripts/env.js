const node_env = process.env.NODE_ENV || 'truffle'
console.log(`Using node_env: '${node_env}'.`)
let ENV = require('dotenv-flow').config({
  node_env,
})
if (ENV.error) {
  throw ENV.error
}
if (ENV.parsed.DUMP_ENV) {
  console.log({ ...ENV.parsed })
}
module.exports = { ...ENV.parsed }
