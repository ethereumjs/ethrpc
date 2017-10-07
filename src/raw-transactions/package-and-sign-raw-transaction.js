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
 * @param {string} accountType One of "privateKey", "uPort", or "ledger".
 * @param {function} callback Callback function.
 * @return {string|void} Signed transaction.
 */
function packageAndSignRawTransaction(payload, address, privateKeyOrSigner, accountType, callback) {
  return function (dispatch, getState) {
    var packaged, state = getState();
    if (!payload || payload.constructor !== Object) return callback(errors.TRANSACTION_FAILED);
    if (!address || !privateKeyOrSigner) return callback(errors.NOT_LOGGED_IN);
    packaged = packageRawTransaction(payload, address, state.networkID, state.currentBlock);
    if (state.debug.broadcast) console.log("[ethrpc] packaged:", JSON.stringify(packaged, null, 2));
    dispatch(setRawTransactionGasPrice(packaged, function (packaged) {
      if (packaged.error) return callback(packaged);
      dispatch(setRawTransactionNonce(packaged, address, function (packaged) {
        if (packaged.error) return callback(packaged);
        signRawTransaction(packaged, privateKeyOrSigner, accountType, function (err, result) {
          callback(err || result);
        });
      }));
    }));
  };
}

module.exports = packageAndSignRawTransaction;
