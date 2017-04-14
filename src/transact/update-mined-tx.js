"use strict";

var abi = require("augur-abi");
var BigNumber = require("bignumber.js");
var eth = require("../wrappers/eth");
var getLoggedReturnValue = require("../transact/get-logged-return-value");
var callContractFunction = require("../transact/call-contract-function");
var handleRPCError = require("../decode-response/handle-rpc-error");
var convertResponseToReturnsType = require("../decode-response/convert-response-to-returns-type");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");
var constants = require("../constants");

function updateMinedTx(txHash) {
  return function (dispatch, getState) {
    var debug, transaction, currentBlock, state = getState();
    debug = state.debug;
    currentBlock = state.currentBlock;
    dispatch({
      type: "SET_TRANSACTION_CONFIRMATIONS",
      hash: txHash,
      currentBlockNumber: currentBlock.number
    });
    transaction = state.transactions[txHash];
    if (transaction.confirmations >= constants.REQUIRED_CONFIRMATIONS) {
      dispatch({ type: "TRANSACTION_CONFIRMED", hash: txHash });
      if (isFunction(transaction.onSuccess)) {
        dispatch(eth.getBlockByNumber([transaction.tx.blockNumber, false], function (block) {
          if (block && block.timestamp) {
            dispatch({
              type: "UPDATE_TRANSACTION",
              hash: txHash,
              data: { tx: { timestamp: parseInt(block.timestamp, 16) } }
            });
          }
          if (!transaction.payload.mutable) {
            dispatch({
              type: "UPDATE_TRANSACTION",
              hash: txHash,
              data: { tx: { callReturn: transaction.callReturn } }
            });
            dispatch(eth.getTransactionReceipt(txHash, function (receipt) {
              if (debug.tx) console.log("got receipt:", receipt);
              if (receipt && receipt.gasUsed) {
                dispatch({
                  type: "UPDATE_TRANSACTION",
                  hash: txHash,
                  data: {
                    tx: {
                      gasFees: abi.unfix(new BigNumber(receipt.gasUsed, 16).times(new BigNumber(transaction.tx.gasPrice, 16)), "string")
                    }
                  }
                });
              }
              dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
              transaction.onSuccess(getState().transactions[txHash].tx);
            }));
          } else {
            dispatch(getLoggedReturnValue(txHash, function (err, log) {
              var e;
              if (debug.tx) console.log("loggedReturnValue:", err, log);
              if (err) {
                transaction.payload.send = false;
                dispatch(callContractFunction(transaction.payload, function (callReturn) {
                  var e;
                  dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
                  if (isFunction(transaction.onFailed)) {
                    if (err.error !== errors.NULL_CALL_RETURN.error) {
                      err.hash = txHash;
                      transaction.onFailed(err);
                    } else {
                      e = handleRPCError(transaction.payload.method, transaction.payload.returns, callReturn);
                      e.hash = txHash;
                      transaction.onFailed(e);
                    }
                  }
                }));
              } else {
                e = handleRPCError(transaction.payload.method, transaction.payload.returns, log.returnValue);
                if (debug.tx) console.log("handleRPCError:", e);
                if (e && e.error) {
                  e.gasFees = abi.unfix(log.gasUsed.times(new BigNumber(transaction.tx.gasPrice, 16)), "string");
                  dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
                  if (isFunction(transaction.onFailed)) {
                    e.hash = txHash;
                    transaction.onFailed(e);
                  }
                } else {
                  dispatch({
                    type: "UPDATE_TRANSACTION",
                    hash: txHash,
                    data: {
                      tx: {
                        callReturn: convertResponseToReturnsType(transaction.payload.returns, log.returnValue),
                        gasFees: abi.unfix(log.gasUsed.times(new BigNumber(transaction.tx.gasPrice, 16)), "string")
                      }
                    }
                  });
                  dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
                  transaction.onSuccess(getState().transactions[txHash].tx);
                }
              }
            }));
          }
        }));
      } else {
        dispatch({ type: "UNLOCK_TRANSACTION", hash: transaction.hash });
      }
    } else {
      dispatch({ type: "UNLOCK_TRANSACTION", hash: transaction.hash });
    }
  };
}

module.exports = updateMinedTx;
