"use strict";

var assign = require("lodash.assign");
var eth = require("../wrappers/eth");
var updateMinedTx = require("../transact/update-mined-tx");
var transact = require("../transact/transact");
var isFunction = require("../utils/is-function");
var logError = require("../utils/log-error");
var errors = require("../errors/codes");
var RPCError = require("../errors/rpc-error");
var constants = require("../constants");

function updatePendingTx(txHash) {
  return function (dispatch, getState) {
    var storedTransaction = getState().transactions[txHash];
    var onFailed = isFunction(storedTransaction.onFailed) ? storedTransaction.onFailed : logError;
    dispatch(eth.getTransactionByHash(txHash, function (err, onChainTx) {
      if (err) return onFailed(err);
      dispatch({
        type: "UPDATE_TRANSACTION",
        hash: txHash,
        data: { tx: onChainTx || {} },
      });

      // if transaction is null, then it was dropped from the txpool
      if (onChainTx === null) {
        dispatch({ type: "INCREMENT_TRANSACTION_PAYLOAD_TRIES", hash: txHash });
        var transaction = getState().transactions[txHash];

        // if we have retries left, then resubmit the transaction
        if (transaction.payload.tries > constants.TX_RETRY_MAX) {
          dispatch({ type: "TRANSACTION_FAILED", hash: txHash });
          dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
          onFailed(new RPCError(assign({}, errors.TRANSACTION_RETRY_MAX_EXCEEDED, { hash: txHash })));
        } else {
          dispatch({ type: "DECREMENT_HIGHEST_NONCE" });
          dispatch({ type: "TRANSACTION_RESUBMITTED", hash: txHash });
          dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
          if (getState().debug.tx) console.log("resubmitting tx:", txHash);
          dispatch(transact(transaction.payload, (transaction.meta || {}).signer, (transaction.meta || {}).accountType, transaction.onSent, transaction.onSuccess, transaction.onFailed));
        }

      // non-null transaction: transaction still alive and kicking!
      // check if it has been mined yet (block number is non-null)
      } else {
        if (onChainTx.blockNumber) {
          dispatch({
            type: "UPDATE_TRANSACTION",
            hash: txHash,
            data: {
              tx: {
                blockNumber: parseInt(onChainTx.blockNumber, 16),
                blockHash: onChainTx.blockHash,
              },
            },
          });
          dispatch({ type: "TRANSACTION_SEALED", hash: txHash });
          var currentBlock = getState().currentBlock;
          if (currentBlock != null && currentBlock.number != null) {
            dispatch({
              type: "SET_TRANSACTION_CONFIRMATIONS",
              hash: txHash,
              currentBlockNumber: currentBlock.number,
            });
            dispatch(updateMinedTx(txHash));
          } else {
            dispatch(eth.blockNumber(null, function (err, blockNumber) {
              if (err) return onFailed(err);
              dispatch({ type: "SET_CURRENT_BLOCK", data: { number: blockNumber } });
              dispatch({
                type: "SET_TRANSACTION_CONFIRMATIONS",
                hash: txHash,
                currentBlockNumber: parseInt(blockNumber, 16),
              });
              dispatch(updateMinedTx(txHash));
            }));
          }
        } else {
          dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
        }
      }
    }));
  };
}

module.exports = updatePendingTx;
