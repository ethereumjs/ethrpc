"use strict";

var verifyRawTransactionNonce = require("./verify-raw-transaction-nonce");
var isFunction = require("../utils/is-function");

/**
 * Use the number of transactions from this account to set the nonce.
 * @param {Object} packaged Packaged transaction.
 * @param {string} address The sender's Ethereum address.
 * @param {function=} callback Callback function (optional).
 * @return {Object|void} Packaged transaction with nonce set.
 */
var setRawTransactionNonce = function (packaged, address, callback) {
  var transactionCount;
  if (!isFunction(callback)) {
    transactionCount = this.pendingTxCount(address);
    // if (this.debug.nonce) {
    //   console.log("[ethrpc] transaction count:", parseInt(transactionCount, 16));
    // }
    if (transactionCount && !transactionCount.error && !(transactionCount instanceof Error)) {
      packaged.nonce = parseInt(transactionCount, 16);
    }
    packaged.nonce = verifyRawTransactionNonce(packaged.nonce);
    return packaged;
  }
  this.pendingTxCount(address, function (transactionCount) {
    // if (self.debug.nonce) {
    //   console.log("[ethrpc] transaction count:", parseInt(transactionCount, 16));
    // }
    if (transactionCount && !transactionCount.error && !(transactionCount instanceof Error)) {
      packaged.nonce = parseInt(transactionCount, 16);
    }
    packaged.nonce = verifyRawTransactionNonce(packaged.nonce);
    callback(packaged);
  });
};

module.exports = setRawTransactionNonce;
