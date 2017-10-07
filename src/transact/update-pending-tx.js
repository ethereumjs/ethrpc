"use strict";

var clone = require("clone");
var eth = require("../wrappers/eth");
var updateMinedTx = require("../transact/update-mined-tx");
var transact = require("../transact/transact");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");
var constants = require("../constants");

function updatePendingTx(txHash) {
  return function (dispatch, getState) {
    var currentBlock;
    dispatch(eth.getTransactionByHash(txHash, function (onChainTx) {
      var e, storedTransaction;
      dispatch({
        type: "UPDATE_TRANSACTION",
        hash: txHash,
        data: { tx: onChainTx || {} }
      });

      // if transaction is null, then it was dropped from the txpool
      if (onChainTx === null) {
        dispatch({ type: "INCREMENT_TRANSACTION_PAYLOAD_TRIES", hash: txHash });

        // if we have retries left, then resubmit the transaction
        if (getState().transactions[txHash].payload.tries > constants.TX_RETRY_MAX) {
          dispatch({ type: "TRANSACTION_FAILED", hash: txHash });
          dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
          storedTransaction = getState().transactions[txHash];
          if (isFunction(storedTransaction.onFailed)) {
            e = clone(errors.TRANSACTION_RETRY_MAX_EXCEEDED);
            e.hash = txHash;
            storedTransaction.onFailed(e);
          }
        } else {
          dispatch({ type: "DECREMENT_HIGHEST_NONCE" });
          dispatch({ type: "TRANSACTION_RESUBMITTED", hash: txHash });
          dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
          storedTransaction = getState().transactions[txHash];
          if (getState().debug.tx) console.log("resubmitting tx:", txHash);
          dispatch(transact(storedTransaction.payload, (storedTransaction.meta || {}).signer, (storedTransaction.meta || {}).accountType, storedTransaction.onSent, storedTransaction.onSuccess, storedTransaction.onFailed));
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
                blockHash: onChainTx.blockHash
              }
            }
          });
          dispatch({ type: "TRANSACTION_SEALED", hash: txHash });
          currentBlock = getState().currentBlock;
          if (currentBlock && currentBlock.number != null) {
            dispatch({
              type: "SET_TRANSACTION_CONFIRMATIONS",
              hash: txHash,
              currentBlockNumber: currentBlock.number
            });
            dispatch(updateMinedTx(txHash));
          } else {
            dispatch(eth.blockNumber(null, function (blockNumber) {
              // dispatch({ type: "SET_CURRENT_BLOCK", block: { number: parseInt(blockNumber, 16) } });
              dispatch({ type: "SET_CURRENT_BLOCK", data: { number: blockNumber } });
              dispatch({
                type: "SET_TRANSACTION_CONFIRMATIONS",
                hash: txHash,
                currentBlockNumber: parseInt(blockNumber, 16)
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
