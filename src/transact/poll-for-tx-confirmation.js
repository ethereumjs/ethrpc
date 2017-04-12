"use strict";

var checkBlockHash = require("./check-block-hash");
var txNotify = require("./tx-notify");
var isFunction = require("../utils/is-function");

// poll the network until the transaction is included in a block
// (i.e., has a non-null blockHash field)
function pollForTxConfirmation(txHash, numConfirmations, callback) {
  return function (dispatch) {
    var tx, minedTx;
    if (!isFunction(callback)) {
      tx = dispatch(txNotify(txHash));
      if (tx === null) return null;
      minedTx = dispatch(checkBlockHash(tx, numConfirmations));
      if (minedTx !== null) return minedTx;
      return dispatch(pollForTxConfirmation(txHash, numConfirmations));
    }
    dispatch(txNotify(txHash, function (err, tx) {
      if (err) return callback(err);
      if (tx === null) return callback(null, null);
      dispatch(checkBlockHash(tx, numConfirmations, function (err, minedTx) {
        if (err) return callback(err);
        if (minedTx !== null) return callback(null, minedTx);
        dispatch(pollForTxConfirmation(txHash, numConfirmations, callback));
      }));
    }));
  };
}

module.exports = pollForTxConfirmation;
