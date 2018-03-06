"use strict";

var immutableDelete = require("immutable-delete");
var packageRawTransaction = require("./package-raw-transaction");
var setRawTransactionNonce = require("./set-raw-transaction-nonce");
var setRawTransactionGasPrice = require("./set-raw-transaction-gas-price");
var signRawTransaction = require("./sign-raw-transaction");
var isObject = require("../utils/is-object");
var RPCError = require("../errors/rpc-error");

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
    var state = getState();
    if (!isObject(payload)) return callback(new RPCError("TRANSACTION_PAYLOAD_INVALID", { payload: payload }));
    if (address == null || privateKeyOrSigner == null) return callback(new RPCError("NOT_LOGGED_IN"));
    var packaged = packageRawTransaction(payload, address, state.networkID, state.currentBlock);
    if (state.debug.broadcast) console.log("[ethrpc] packaged:", JSON.stringify(packaged, null, 2));
    dispatch(setRawTransactionGasPrice(packaged, function (err, packaged) {
      if (err) return callback(err);
      dispatch(setRawTransactionNonce(packaged, address, function (err, packaged) {
        if (err) return callback(err);
        signRawTransaction(immutableDelete(packaged, "returns"), privateKeyOrSigner, accountType, callback);
      }));
    }));
  };
}

module.exports = packageAndSignRawTransaction;
