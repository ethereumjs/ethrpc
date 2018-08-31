#!/usr/bin/env node

var ethrpc = global.ethrpc = require("./src");
var logError = global.logError = require("./src/utils/log-error");

var connectOptions = global.connectOptions = {
  httpAddresses: ["http://127.0.0.1:8545"],
  wsAddresses: ["ws://127.0.0.1:8546"],
  ipcAddresses: [],
  errorHandler: logError,
};

ethrpc.setDebugOptions({ connect: true });

ethrpc.connect(connectOptions, function (err) {
  if (err) return console.error(err);
  ethrpc.eth.coinbase(function (err, coinbase) {
    if (err) return console.error(err);
    if (coinbase == null) console.log("coinbase address not found");
  });
  ethrpc.net.version(function (err, networkID) {
    if (err) return console.error(err);
    if (networkID == null) console.error("net_version failed");
  });
});
