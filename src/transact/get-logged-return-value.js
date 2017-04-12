"use strict";

var BigNumber = require("bignumber.js");
var eth = require("../wrappers/eth");
var isFunction = require("../utils/is-function");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");

function getLoggedReturnValue(txHash, callback) {
  return function (dispatch, getState) {
    var receipt, log;
    if (!isFunction(callback)) {
      receipt = dispatch(eth.getTransactionReceipt(txHash));
      if (!receipt || !receipt.logs || !receipt.logs.length) {
        throw new RPCError(errors.NULL_CALL_RETURN);
      }
      log = receipt.logs[receipt.logs.length - 1];
      if (!log || log.data === null || log.data === undefined) {
        throw new RPCError(errors.NULL_CALL_RETURN);
      }
      return {
        returnValue: log.data,
        gasUsed: new BigNumber(receipt.gasUsed, 16)
      };
    }
    dispatch(eth.getTransactionReceipt(txHash, function (receipt) {
      var log;
      if (getState().debug.tx) console.log("got receipt:", receipt);
      if (!receipt || !receipt.logs || !receipt.logs.length) {
        return callback(errors.NULL_CALL_RETURN);
      }
      log = receipt.logs[receipt.logs.length - 1];
      if (!log || log.data === null || log.data === undefined) {
        return callback(errors.NULL_CALL_RETURN);
      }
      callback(null, {
        returnValue: log.data,
        gasUsed: new BigNumber(receipt.gasUsed, 16)
      });
    }));
  };
}

module.exports = getLoggedReturnValue;
