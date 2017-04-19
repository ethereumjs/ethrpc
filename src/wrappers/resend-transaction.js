"use strict";

var abi = require("augur-abi");
var clone = require("clone");
var eth = require("../wrappers/eth");

function resendTransaction(transaction, gasPrice, gasLimit, callback) {
  return function (dispatch) {
    var newTransaction = clone(transaction);
    if (gasPrice) newTransaction.gasPrice = abi.hex(gasPrice);
    if (gasLimit) newTransaction.gasLimit = abi.hex(gasLimit);
    return dispatch(eth.sendTransaction(newTransaction, callback));
  };
}

module.exports = resendTransaction;
