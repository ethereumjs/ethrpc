"use strict";

module.exports.debug = {
  connect: false,
  tx: false,
  broadcast: false,
};
module.exports.configuration = {
  httpAddresses: [],
  wsAddresses: [],
  ipcAddresses: [],
  networkID: null,
  connectionTimeout: 10000,
  pollingIntervalMilliseconds: 30000,
  blockRetention: 100,
  startBlockStreamOnConnect: true,
};
module.exports.currentBlock = null;
module.exports.highestNonce = -1;
module.exports.gasPrice = 20000000000;
module.exports.noRelay = {};
module.exports.networkID = null;
module.exports.transactions = {};
module.exports.subscriptions = {};
module.exports.coinbase = null;
