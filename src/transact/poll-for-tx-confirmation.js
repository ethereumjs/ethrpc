"use strict";

var checkBlockHash = require("./check-block-hash");
var txNotify = require("./tx-notify");
var isFunction = require("../utils/is-function");

// poll the network until the transaction is included in a block
// (i.e., has a non-null blockHash field)
function pollForTxConfirmation(txHash, numConfirmations, callback) {
  return function (dispatch, getState) {
    var tx, minedTx;
    if (!isFunction(callback)) {
      tx = txNotify(txHash);
      if (tx === null) return null;
      minedTx = checkBlockHash(tx, numConfirmations);
      if (minedTx !== null) return minedTx;
      return pollForTxConfirmation(txHash, numConfirmations);
    }
    txNotify(txHash, function (err, tx) {
      if (err) return callback(err);
      if (tx === null) return callback(null, null);
      checkBlockHash(tx, numConfirmations, function (err, minedTx) {
        if (err) return callback(err);
        if (minedTx !== null) return callback(null, minedTx);
        pollForTxConfirmation(txHash, numConfirmations, callback);
      });
    });
  };
}

module.exports = pollForTxConfirmation;
