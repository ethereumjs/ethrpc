"use strict";

var eth_getTransactionByHash = require("../wrappers/eth").getTransactionByHash;
var updateSealedTransaction = require("../transact/update-sealed-transaction");

function updatePendingTransaction(transactionHash, callback) {
  return function (dispatch, getState) {
    dispatch(eth_getTransactionByHash(transactionHash, function (err, onChainTransaction) {
      if (err) return callback(err);
      dispatch({ type: "UPDATE_ON_CHAIN_TRANSACTION", hash: transactionHash, data: onChainTransaction });

      // if transaction is null, then it isn't in the txpool
      if (onChainTransaction === null) {
        callback(null);
      // non-null transaction: transaction not dropped
      // check if it has been sealed (mined) yet by checking for a greater-than-zero blockhash
      } else if (parseInt(onChainTransaction.blockHash, 16) > 0) { // sealed
        dispatch({ type: "UPDATE_ON_CHAIN_TRANSACTION", hash: transactionHash, data: onChainTransaction });
        dispatch({ type: "TRANSACTION_SEALED", hash: transactionHash });
        dispatch({ type: "SET_TRANSACTION_CONFIRMATIONS", hash: transactionHash, currentBlockNumber: parseInt(getState().currentBlock.number, 16) });
        dispatch(updateSealedTransaction(transactionHash, callback));
      } else { // not yet sealed
        callback(null);
      }
    }));
  };
}

module.exports.default = updatePendingTransaction;
