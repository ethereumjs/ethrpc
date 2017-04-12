"use strict";

var abi = require("augur-abi");
var clone = require("clone");
var eth = require("../wrappers/eth");
var signRawTransaction = require("../raw-transactions/sign-raw-transaction");

function resendRawTransaction(transaction, privateKey, gasPrice, gasLimit, callback) {
  return function (dispatch) {
    var newTransaction = clone(transaction);
    if (gasPrice) newTransaction.gasPrice = abi.hex(gasPrice);
    if (gasLimit) newTransaction.gasLimit = abi.hex(gasLimit);
    return dispatch(eth.sendRawTransaction(signRawTransaction(newTransaction, privateKey), callback));
  };
}

module.exports = resendRawTransaction;
