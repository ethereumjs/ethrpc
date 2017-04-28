"use strict";

var BigNumber = require("bignumber.js");
var eth = require("../wrappers/eth");
var errors = require("../errors/codes");

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID, ROUNDING_MODE: BigNumber.ROUND_HALF_DOWN });

function getLoggedReturnValue(txHash, callback) {
  return function (dispatch, getState) {
    dispatch(eth.getTransactionReceipt(txHash, function (receipt) {
      var log;
      if (getState().debug.tx) console.log("got receipt:", receipt);
      if (!receipt || !receipt.logs || !receipt.logs.length) {
        return callback(errors.NULL_CALL_RETURN);
      }
      log = receipt.logs[receipt.logs.length - 1];
      if (!log || log.data == null) {
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
