"use strict";

var checkBlockHash = require("./check-block-hash");
var txNotify = require("./tx-notify");

// poll the network until the transaction is included in a block
// (i.e., has a non-null blockHash field)
function pollForTxConfirmation(txHash, numConfirmations, callback) {
  return function (dispatch) {
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
