"use strict";

var assign = require("lodash.assign");
var speedomatic = require("speedomatic");
var BigNumber = require("bignumber.js");
var eth = require("../wrappers/eth");
var isFunction = require("../utils/is-function");
var logError = require("../utils/log-error");
var RPCError = require("../errors/rpc-error");
var constants = require("../constants");

function updateSealedTransaction(transactionHash) {
  return function (dispatch, getState) {
    var state = getState();
    var debug = state.debug;
    var currentBlock = state.currentBlock;
    dispatch({
      type: "SET_TRANSACTION_CONFIRMATIONS",
      hash: transactionHash,
      currentBlockNumber: currentBlock.number,
    });
    var transaction = getState().transactions[transactionHash];
    var onFailed = isFunction(transaction.onFailed) ? transaction.onFailed : logError;
    if (transaction.confirmations >= constants.REQUIRED_CONFIRMATIONS) {
      dispatch({ type: "TRANSACTION_CONFIRMED", hash: transactionHash });
      dispatch(eth.getBlockByNumber([transaction.tx.blockNumber, false], function (err, block) {
        if (err) return onFailed(err);
        if (block == null) console.warn("No block found for block number", transaction.tx.blockNumber);
        if (block && block.timestamp != null) {
          dispatch({
            type: "UPDATE_TRANSACTION",
            hash: transactionHash,
            data: { tx: { timestamp: parseInt(block.timestamp, 16) } },
          });
        }
        dispatch({
          type: "UPDATE_TRANSACTION",
          hash: transactionHash,
          data: { tx: { callReturn: transaction.tx.callReturn } },
        });
        dispatch(eth.getTransactionReceipt(transactionHash, function (err, receipt) {
          if (debug.tx) console.log("eth_getTransactionReceipt", transactionHash, err, receipt);
          if (err) {
            dispatch({ type: "UNLOCK_TRANSACTION", hash: transactionHash });
            return onFailed(assign(err, { hash: transactionHash }));
          }
          if (receipt == null) {
            dispatch({ type: "UNLOCK_TRANSACTION", hash: transactionHash });
            return onFailed(new RPCError("TRANSACTION_RECEIPT_NOT_FOUND", { hash: transactionHash }));
          }
          if (receipt.gasUsed) {
            dispatch({
              type: "UPDATE_TRANSACTION",
              hash: transactionHash,
              data: {
                tx: {
                  gasFees: speedomatic.unfix(new BigNumber(receipt.gasUsed, 16).times(new BigNumber(transaction.tx.gasPrice, 16)), "string"),
                },
              },
            });
          }
          dispatch({ type: "UNLOCK_TRANSACTION", hash: transactionHash });
          if (receipt.status != null) {
            if (parseInt(receipt.status, 16) === 0) {
              onFailed(getState().transactions[transactionHash].tx);
            } else if (parseInt(receipt.status, 16) === 1) {
              transaction.onSuccess(getState().transactions[transactionHash].tx);
            }
          } else {
            transaction.onSuccess(getState().transactions[transactionHash].tx);
          }
        }));
      }));
    } else {
      dispatch({ type: "UNLOCK_TRANSACTION", hash: transaction.hash });
    }
  };
}

module.exports = updateSealedTransaction;
