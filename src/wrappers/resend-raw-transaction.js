"use strict";

var speedomatic = require("speedomatic");
var clone = require("clone");
var eth = require("../wrappers/eth");
var signRawTransactionWithKey = require("../raw-transactions/sign-raw-transaction-with-key");

function resendRawTransaction(transaction, privateKey, gasPrice, gasLimit, callback) {
  return function (dispatch) {
    var signedTransaction;
    var newTransaction = clone(transaction);
    if (gasPrice) newTransaction.gasPrice = speedomatic.hex(gasPrice);
    if (gasLimit) newTransaction.gasLimit = speedomatic.hex(gasLimit);
    signedTransaction = signRawTransactionWithKey(newTransaction, privateKey);
    return dispatch(eth.sendRawTransaction(signedTransaction, callback));
  };
}

module.exports = resendRawTransaction;
