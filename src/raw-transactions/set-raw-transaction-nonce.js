"use strict";

var assign = require("lodash.assign");
var eth_getTransactionCount = require("../wrappers/eth").getTransactionCount;
var verifyRawTransactionNonce = require("./verify-raw-transaction-nonce");
var errors = require("../errors/codes");
var RPCError = require("../errors/rpc-error");


/**
 * Use the number of transactions from this account to set the nonce.
 * @param {Object} packaged Packaged transaction.
 * @param {string} address The sender's Ethereum address.
 * @param {function} callback Callback function.
 * @return {Object} Packaged transaction with nonce set.
 */
function setRawTransactionNonce(packaged, address, callback) {
  return function (dispatch, getState) {
    dispatch(eth_getTransactionCount([address, "pending"], function (err, transactionCount) {
      if (getState().debug.tx) console.log("transaction count:", address, transactionCount, parseInt(transactionCount, 16));
      if (err) return callback(err);
      if (transactionCount == null) return callback(new RPCError(errors.NO_RESPONSE));
      callback(null, assign({}, packaged, { nonce: dispatch(verifyRawTransactionNonce(parseInt(transactionCount, 16))) }));
    }));
  };
}

module.exports = setRawTransactionNonce;
