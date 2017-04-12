"use strict";

var eth = require("../wrappers/eth");
var packageAndSignRawTransaction = require("./package-and-sign-raw-transaction");
var handleRawTransactionError = require("./handle-raw-transaction-error");
var RPCError = require("../errors/rpc-error");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");

/**
 * Package, sign, and submit a raw transaction to Ethereum.
 * @param {Object} payload Static API data with "params" and "from" set.
 * @param {string} address The sender's Ethereum address.
 * @param {buffer} privateKey The sender's plaintext private key.
 * @param {function=} callback Callback function (optional).
 * @return {string|void} Transaction hash (if successful).
 */
function packageAndSubmitRawTransaction(payload, address, privateKey, callback) {
  return function (dispatch, getState) {
    var response, err, state;
    state = getState();
    if (!isFunction(callback)) {
      response = dispatch(eth.sendRawTransaction(dispatch(packageAndSignRawTransaction(payload, address, privateKey))));
      if (state.debug.broadcast) console.log("[ethrpc] sendRawTransaction", response);
      if (!response) throw new RPCError(errors.RAW_TRANSACTION_ERROR);
      if (response.error) {
        err = dispatch(handleRawTransactionError(response));
        if (err !== null) throw new RPCError(err);
        return dispatch(packageAndSubmitRawTransaction(payload, address, privateKey));
      }
      return response;
    }
    dispatch(packageAndSignRawTransaction(payload, address, privateKey, function (signedRawTransaction) {
      if (signedRawTransaction.error) return callback(signedRawTransaction);
      dispatch(eth.sendRawTransaction(signedRawTransaction, function (response) {
        var err;
        if (state.debug.broadcast) console.log("[ethrpc] sendRawTransaction", response);
        if (!response) return callback(errors.RAW_TRANSACTION_ERROR);
        if (response.error) {
          err = dispatch(handleRawTransactionError(response));
          if (err !== null) return callback(err);
          dispatch(packageAndSubmitRawTransaction(payload, address, privateKey, callback));
        } else {
          callback(response);
        }
      }));
    }));
  };
}

module.exports = packageAndSubmitRawTransaction;
