"use strict";

var packageRawTransaction = require("./package-raw-transaction");
var setRawTransactionNonce = require("./set-raw-transaction-nonce");
var setRawTransactionGasPrice = require("./set-raw-transaction-gas-price");
var signRawTransaction = require("./sign-raw-transaction");
var isFunction = require("../utils/is-function");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");

/**
 * Package and sign a raw transaction.
 * @param {Object} payload Static API data with "params" and "from" set.
 * @param {string} address The sender's Ethereum address.
 * @param {buffer|function} privateKeyOrSigner Sender's plaintext private key or signing function.
 * @param {function=} callback Callback function (optional).
 * @return {string|void} Signed transaction.
 */
function packageAndSignRawTransaction(payload, address, privateKeyOrSigner, callback) {
  return function (dispatch, getState) {
    var packaged, state;
    state = getState();
    if (!payload || payload.constructor !== Object) {
      if (!isFunction(callback)) throw new RPCError(errors.TRANSACTION_FAILED);
      return callback(errors.TRANSACTION_FAILED);
    }
    if (!address || !privateKeyOrSigner) {
      if (!isFunction(callback)) throw new RPCError(errors.NOT_LOGGED_IN);
      return callback(errors.NOT_LOGGED_IN);
    }
    packaged = packageRawTransaction(payload, address, state.currentBlock, state.networkID);
    if (payload.gasPrice) packaged.gasPrice = payload.gasPrice;
    if (state.debug.broadcast) {
      console.log("[ethrpc] packaged:", JSON.stringify(packaged, null, 2));
    }
    if (!isFunction(callback)) {
      if (isFunction(privateKeyOrSigner)) {
        throw new Error("Cannot do synchronous signing with a signer function.");
      }
      packaged = dispatch(setRawTransactionGasPrice(packaged));
      packaged = dispatch(setRawTransactionNonce(packaged, address));
      return signRawTransaction(packaged, privateKeyOrSigner);
    }
    dispatch(setRawTransactionGasPrice(packaged, function (packaged) {
      if (packaged.error) return callback(packaged);
      dispatch(setRawTransactionNonce(packaged, address, function (packaged) {
        signRawTransaction(packaged, privateKeyOrSigner, function (err, result) {
          callback(err || result);
        });
      }));
    }));
  };
}

module.exports = packageAndSignRawTransaction;
