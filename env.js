global.abi = require("augur-abi");
global.rpc = require("./src");
global.log = console.log;

var configuration = {
  httpAddresses: ["http://127.0.0.1:8545"],
  wsAddresses: ["ws://127.0.0.1:8546"],
  errorHandler: log
};

rpc.setDebugOptions({ connect: true });
rpc.connect(configuration, function (err) {
  if (err) return console.error("ethrpc connection failed:", err);
  global.COINBASE = rpc.eth.coinbase();
  global.NETWORK_ID = rpc.net.version();
  global.contracts = require("augur-contracts")[NETWORK_ID];
});
