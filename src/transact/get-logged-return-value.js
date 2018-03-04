"use strict";

var BigNumber = require("bignumber.js");
var eth_getTransactionReceipt = require("../wrappers/eth").getTransactionReceipt;
var RPCError = require("../errors/rpc-error");

function getLoggedReturnValue(txHash, callback) {
  return function (dispatch, getState) {
    dispatch(eth_getTransactionReceipt(txHash, function (err, receipt) {
      if (getState().debug.tx) console.log("got receipt:", receipt);
      if (err) return callback(err);
      if (!receipt || !Array.isArray(receipt.logs) || !receipt.logs.length) return callback(new RPCError("NULL_CALL_RETURN"));
      var log = receipt.logs[receipt.logs.length - 1];
      if (!log || log.data == null) return callback(new RPCError("NULL_CALL_RETURN"));
      callback(null, { returnValue: log.data, gasUsed: new BigNumber(receipt.gasUsed, 16) });
    }));
  };
}

module.exports = getLoggedReturnValue;
