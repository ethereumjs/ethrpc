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

function updateMinedTx(tx) {
  return function (dispatch, getState) {
    var state, onChainTx;
    state = getState();
    onChainTx = tx.tx;
    dispatch({
      type: "SET_TRANSACTION_CONFIRMATIONS",
      hash: tx.hash,
      currentBlockNumber: state.currentBlock.number
    });
    // tx.confirmations = self.block.number - onChainTx.blockNumber;
    if (state.debug.tx) console.log("confirmations for", tx.hash, tx.confirmations);
    if (tx.confirmations >= constants.REQUIRED_CONFIRMATIONS) {
      dispatch({ type: "TRANSACTION_CONFIRMED", hash: tx.hash });
      // tx.status = "confirmed";
      if (isFunction(tx.onSuccess)) {
        dispatch(eth.getBlockByNumber([onChainTx.blockNumber, false], function (block) {
          if (block && block.timestamp) {
            onChainTx.timestamp = parseInt(block.timestamp, 16);
          }
          if (!tx.payload.mutable) {
            onChainTx.callReturn = tx.callReturn;
            dispatch(eth.getTransactionReceipt(tx.hash, function (receipt) {
              if (state.debug.tx) console.log("got receipt:", receipt);
              if (receipt && receipt.gasUsed) {
                onChainTx.gasFees = abi.unfix(new BigNumber(receipt.gasUsed, 16).times(new BigNumber(onChainTx.gasPrice, 16)), "string");
              }
              tx.locked = false;
              tx.onSuccess(onChainTx);
            }));
          } else {
            dispatch(getLoggedReturnValue(tx.hash, function (err, log) {
              var e;
              if (state.debug.tx) console.log("loggedReturnValue:", err, log);
              if (err) {
                tx.payload.send = false;
                dispatch(callContractFunction(tx.payload, function (callReturn) {
                  var e;
                  tx.locked = false;
                  if (isFunction(tx.onFailed)) {
                    if (err.error !== errors.NULL_CALL_RETURN.error) {
                      err.hash = tx.hash;
                      tx.onFailed(err);
                    } else {
                      e = handleRPCError(tx.payload.method, tx.payload.returns, callReturn);
                      e.hash = tx.hash;
                      tx.onFailed(e);
                    }
                  }
                }));
              } else {
                e = handleRPCError(tx.payload.method, tx.payload.returns, log.returnValue);
                if (state.debug.tx) console.log("handleRPCError:", e);
                if (e && e.error) {
                  e.gasFees = abi.unfix(log.gasUsed.times(new BigNumber(onChainTx.gasPrice, 16)), "string");
                  tx.locked = false;
                  if (isFunction(tx.onFailed)) {
                    e.hash = tx.hash;
                    tx.onFailed(e);
                  }
                } else {
                  onChainTx.callReturn = convertResponseToReturnsType(tx.payload.returns, log.returnValue);
                  onChainTx.gasFees = abi.unfix(log.gasUsed.times(new BigNumber(onChainTx.gasPrice, 16)), "string");
                  tx.locked = false;
                  tx.onSuccess(onChainTx);
                }
              }
            }));
          }
        }));
      } else {
        tx.locked = false;
      }
    } else {
      tx.locked = false;
    }
  };
}

module.exports = updateMinedTx;
