"use strict";

var speedomatic = require("speedomatic");
var clone = require("clone");
var eth = require("../wrappers/eth");

function resendTransaction(transaction, gasPrice, gasLimit, callback) {
  return function (dispatch) {
    var newTransaction = clone(transaction);
    if (gasPrice) newTransaction.gasPrice = speedomatic.hex(gasPrice);
    if (gasLimit) newTransaction.gasLimit = speedomatic.hex(gasLimit);
    return dispatch(eth.sendTransaction(newTransaction, callback));
  };
}

module.exports = resendTransaction;
