"use strict";

var abi = require("augur-abi");
var clone = require("clone");
var eth = require("../wrappers/eth");
var signRawTransactionWithKey = require("../raw-transactions/sign-raw-transaction-with-key");

function resendRawTransaction(transaction, privateKey, gasPrice, gasLimit, callback) {
  return function (dispatch) {
    var signedTransaction;
    var newTransaction = clone(transaction);
    if (gasPrice) newTransaction.gasPrice = abi.hex(gasPrice);
    if (gasLimit) newTransaction.gasLimit = abi.hex(gasLimit);
    signedTransaction = signRawTransactionWithKey(newTransaction, privateKey);
    return dispatch(eth.sendRawTransaction(signedTransaction, callback));
  };
}

module.exports = resendRawTransaction;
