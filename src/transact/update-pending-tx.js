"use strict";

var clone = require("clone");
var eth = require("../wrappers/eth");
var updateMinedTx = require("../transact/update-mined-tx");
var transact = require("../transact/transact");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");
var constants = require("../constants");

function updatePendingTx(tx) {
  return function (dispatch, getState) {
    dispatch(eth.getTransactionByHash(tx.hash, function (onChainTx) {
      var e;
      dispatch({
        type: "UPDATE_TRANSACTION",
        hash: tx.hash,
        key: "tx",
        value: onChainTx
      });
      // tx.tx = abi.copy(onChainTx);

      // if transaction is null, then it was dropped from the txpool
      if (onChainTx === null) {
        dispatch({ type: "INCREMENT_TRANSACTION_PAYLOAD_TRIES", hash: tx.hash });
        // tx.payload.tries = (tx.payload.tries) ? tx.payload.tries + 1 : 1;

        // if we have retries left, then resubmit the transaction
        if (tx.payload.tries > constants.TX_RETRY_MAX) {
          dispatch({ type: "TRANSACTION_FAILED", hash: tx.hash });
          // tx.status = "failed";
          dispatch({ type: "UNLOCK_TRANSACTION", hash: tx.hash });
          // tx.locked = false;
          if (isFunction(tx.onFailed)) {
            e = clone(errors.TRANSACTION_RETRY_MAX_EXCEEDED);
            e.hash = tx.hash;
            tx.onFailed(e);
          }
        } else {
          dispatch({ type: "DECREMENT_HIGHEST_NONCE" });
          // --self.rawTxMaxNonce;
          dispatch({ type: "TRANSACTION_RESUBMITTED", hash: tx.hash });
          // tx.status = "resubmitted";
          dispatch({ type: "UNLOCK_TRANSACTION", hash: tx.hash });
          // tx.locked = false;
          if (getState().debug.tx) console.log("resubmitting tx:", tx.hash);
          dispatch(transact(tx.payload, tx.onSent, tx.onSuccess, tx.onFailed));
        }

        // non-null transaction: transaction still alive and kicking!
        // check if it has been mined yet (block number is non-null)
      } else {
        if (onChainTx.blockNumber) {
          dispatch({
            type: "UPDATE_TRANSACTION_BLOCK",
            hash: tx.hash,
            blockNumber: parseInt(onChainTx.blockNumber, 16),
            blockHash: onChainTx.blockHash
          });
          // tx.tx.blockNumber = parseInt(onChainTx.blockNumber, 16);
          // tx.tx.blockHash = onChainTx.blockHash;
          dispatch({ type: "TRANSACTION_MINED", hash: tx.hash });
          // tx.status = "mined";
          dispatch({
            type: "SET_TRANSACTION_CONFIRMATIONS",
            hash: tx.hash,
            currentBlockNumber: getState().currentBlock.number
          });
          // tx.confirmations = self.block.number - tx.tx.blockNumber;
          dispatch(updateMinedTx(tx));
        } else {
          dispatch({ type: "UNLOCK_TRANSACTION", hash: tx.hash });
          // tx.locked = false;
        }
      }
    }));
  };
}

module.exports = updatePendingTx;
