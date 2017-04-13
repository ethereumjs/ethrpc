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

function updateMinedTx(storedTransaction) {
  return function (dispatch, getState) {
    var debug, txHash;
    debug = getState().debug;
    txHash = storedTransaction.hash;
    dispatch({
      type: "SET_TRANSACTION_CONFIRMATIONS",
      hash: txHash,
      currentBlockNumber: getState().currentBlock.number
    });
    // storedTransaction.confirmations = self.block.number - onChainTx.blockNumber;
    if (getState().transactions[txHash].confirmations >= constants.REQUIRED_CONFIRMATIONS) {
      dispatch({ type: "TRANSACTION_CONFIRMED", hash: txHash });
      // storedTransaction.status = "confirmed";
      if (isFunction(storedTransaction.onSuccess)) {
        dispatch(eth.getBlockByNumber([getState().transactions[txHash].tx.blockNumber, false], function (block) {
          if (block && block.timestamp) {
            // onChainTx.timestamp = parseInt(block.timestamp, 16);
            dispatch({
              type: "UPDATE_TRANSACTION",
              hash: txHash,
              data: { tx: { timestamp: parseInt(block.timestamp, 16) } }
            });
          }
          if (!storedTransaction.payload.mutable) {
            dispatch({
              type: "UPDATE_TRANSACTION",
              hash: txHash,
              data: { tx: { callReturn: storedTransaction.callReturn } }
            });
            // onChainTx.callReturn = storedTransaction.callReturn;
            dispatch(eth.getTransactionReceipt(txHash, function (receipt) {
              if (debug.tx) console.log("got receipt:", receipt);
              if (receipt && receipt.gasUsed) {
                dispatch({
                  type: "UPDATE_TRANSACTION",
                  hash: txHash,
                  data: {
                    tx: {
                      gasFees: abi.unfix(new BigNumber(receipt.gasUsed, 16).times(new BigNumber(getState().transactions[txHash].tx.gasPrice, 16)), "string")
                    }
                  }
                });
                // onChainTx.gasFees = abi.unfix(new BigNumber(receipt.gasUsed, 16).times(new BigNumber(onChainTx.gasPrice, 16)), "string");
              }
              dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
              // storedTransaction.locked = false;
              storedTransaction.onSuccess(getState().transactions[txHash].tx);
            }));
          } else {
            dispatch(getLoggedReturnValue(txHash, function (err, log) {
              var e;
              if (debug.tx) console.log("loggedReturnValue:", err, log);
              if (err) {
                storedTransaction.payload.send = false;
                dispatch(callContractFunction(storedTransaction.payload, function (callReturn) {
                  var e;
                  dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
                  // storedTransaction.locked = false;
                  if (isFunction(storedTransaction.onFailed)) {
                    if (err.error !== errors.NULL_CALL_RETURN.error) {
                      err.hash = txHash;
                      storedTransaction.onFailed(err);
                    } else {
                      e = handleRPCError(storedTransaction.payload.method, storedTransaction.payload.returns, callReturn);
                      e.hash = txHash;
                      storedTransaction.onFailed(e);
                    }
                  }
                }));
              } else {
                e = handleRPCError(storedTransaction.payload.method, storedTransaction.payload.returns, log.returnValue);
                if (debug.tx) console.log("handleRPCError:", e);
                if (e && e.error) {
                  e.gasFees = abi.unfix(log.gasUsed.times(new BigNumber(getState().transactions[txHash].tx.gasPrice, 16)), "string");
                  dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
                  // storedTransaction.locked = false;
                  if (isFunction(storedTransaction.onFailed)) {
                    e.hash = txHash;
                    storedTransaction.onFailed(e);
                  }
                } else {
                  dispatch({
                    type: "UPDATE_TRANSACTION",
                    hash: txHash,
                    data: {
                      tx: {
                        callReturn: convertResponseToReturnsType(storedTransaction.payload.returns, log.returnValue),
                        gasFees: abi.unfix(log.gasUsed.times(new BigNumber(getState().transactions[txHash].tx.gasPrice, 16)), "string")
                      }
                    }
                  });
                  // onChainTx.callReturn = convertResponseToReturnsType(storedTransaction.payload.returns, log.returnValue);
                  // onChainTx.gasFees = abi.unfix(log.gasUsed.times(new BigNumber(onChainTx.gasPrice, 16)), "string");
                  dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
                  // storedTransaction.locked = false;
                  storedTransaction.onSuccess(getState().transactions[txHash].tx);
                }
              }
            }));
          }
        }));
      } else {
        dispatch({ type: "UNLOCK_TRANSACTION", hash: storedTransaction.hash });
        // storedTransaction.locked = false;
      }
    } else {
      dispatch({ type: "UNLOCK_TRANSACTION", hash: storedTransaction.hash });
      // storedTransaction.locked = false;
    }
  };
}

module.exports = updateMinedTx;
