global.abi = require("augur-abi");
global.rpc = require("./src");
global.log = console.log;

var configuration = {
  httpAddresses: ["http://127.0.0.1:8545"],
  wsAddresses: ["ws://127.0.0.1:8546"],
  ipcAddresses: [],
  errorHandler: log
};

rpc.setDebugOptions({ connect: true });
rpc.connect(configuration, function (err) {
  if (err) return console.error("ethrpc connection failed:", err);
  rpc.eth.coinbase(function (coinbase) {
    global.COINBASE = coinbase;
  });
  rpc.net.version(function (networkID) {
    global.NETWORK_ID = networkID;
  });
});
