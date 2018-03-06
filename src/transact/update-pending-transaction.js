"use strict";

var eth = require("../wrappers/eth");
var updateSealedTransaction = require("../transact/update-sealed-transaction");
var transact = require("../transact/transact");
var RPCError = require("../errors/rpc-error");
var constants = require("../constants");

function updatePendingTransaction(transactionHash, callback) {
  return function (dispatch, getState) {
    dispatch(eth.getTransactionByHash(transactionHash, function (err, onChainTransaction) {
      if (err) return callback(err);
      dispatch({ type: "UPDATE_ON_CHAIN_TRANSACTION", hash: transactionHash, data: onChainTransaction });

      // if transaction is null, then it was dropped from the txpool
      if (onChainTransaction === null) {
        dispatch({ type: "INCREMENT_TRANSACTION_PAYLOAD_TRIES", hash: transactionHash });

        // if we have retries left, then resubmit the transaction
        if (getState().transactions[transactionHash].payload.tries > constants.TX_RETRY_MAX) { // no retries left, transaction failed :(
          callback(new RPCError("TRANSACTION_RETRY_MAX_EXCEEDED", { data: getState().transactions[transactionHash] }));
        } else {
          dispatch({ type: "DECREMENT_HIGHEST_NONCE" });
          dispatch({ type: "TRANSACTION_RESUBMITTED", hash: transactionHash });
          if (getState().debug.tx) console.log("resubmitting tx:", transactionHash);
          var transaction = getState().transactions[transactionHash];
          var meta = transaction.meta || {};
          dispatch(transact(transaction.payload, meta.signer, meta.accountType, transaction.onSent, transaction.onSuccess, transaction.onFailed));
        }

      // non-null transaction: transaction still alive and kicking!
      // check if it has been sealed (mined) yet by checking for a non-zero blockhash
      } else if (parseInt(onChainTransaction.blockHash, 16) === 0) { // not yet sealed
        callback(null);
      } else { // sealed
        dispatch({ type: "UPDATE_ON_CHAIN_TRANSACTION", hash: transactionHash, data: onChainTransaction });
        dispatch({ type: "TRANSACTION_SEALED", hash: transactionHash });
        dispatch({ type: "SET_TRANSACTION_CONFIRMATIONS", hash: transactionHash, currentBlockNumber: parseInt(getState().currentBlock.number, 16) });
        dispatch(updateSealedTransaction(transactionHash, callback));
      }
    }));
  };
}

module.exports = updatePendingTransaction;
