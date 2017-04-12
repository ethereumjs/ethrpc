"use strict";

var eth = require("../wrappers/eth");
var updateTx = require("../transact/update-tx");
var RPCError = require("../errors/rpc-error");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");

function verifyTxSubmitted(payload, txHash, callReturn, onSent, onSuccess, onFailed, callback) {
  return function (dispatch, getState) {
    var state, storedTransaction, tx;
    state = getState();
    storedTransaction = state.transactions[txHash];
    if (!isFunction(callback)) {
      if (!payload || ((!payload.mutable && payload.returns !== "null") && (txHash === null || txHash === undefined))) {
        throw new RPCError(errors.TRANSACTION_FAILED);
      }
      if (storedTransaction) throw new RPCError(errors.DUPLICATE_TRANSACTION);
      dispatch({
        type: "ADD_TRANSACTION",
        hash: txHash,
        transaction: {
          hash: txHash,
          payload: payload,
          callReturn: callReturn,
          count: 0,
          status: "pending"
        }
      });
      // this.txs[txHash] = {
      //   hash: txHash,
      //   payload: payload,
      //   callReturn: callReturn,
      //   count: 0,
      //   status: "pending"
      // };
      tx = dispatch(eth.getTransaction(txHash));
      if (!tx) throw new RPCError(errors.TRANSACTION_FAILED);
      // this.txs[txHash].tx = tx;
      return dispatch({
        type: "UPDATE_TRANSACTION",
        hash: txHash,
        key: "tx",
        value: tx
      });
    }
    if (!payload || txHash === null || txHash === undefined) {
      return callback(errors.TRANSACTION_FAILED);
    }
    if (storedTransaction) return callback(errors.DUPLICATE_TRANSACTION);
    dispatch({
      type: "ADD_TRANSACTION",
      transaction: {
        hash: txHash,
        payload: payload,
        callReturn: callReturn,
        onSent: onSent,
        onSuccess: onSuccess,
        onFailed: onFailed,
        count: 0,
        status: "pending"
      }
    });
    // this.txs[txHash] = {
    //   hash: txHash,
    //   payload: payload,
    //   callReturn: callReturn,
    //   onSent: onSent,
    //   onSuccess: onSuccess,
    //   onFailed: onFailed,
    //   count: 0,
    //   status: "pending"
    // };
    if (state.currentBlock && state.currentBlock.number) {
      dispatch(updateTx(storedTransaction));
      return callback(null);
    }
    dispatch(eth.blockNumber(function (blockNumber) {
      if (!blockNumber || blockNumber.error) {
        return callback(blockNumber || "rpc.blockNumber lookup failed");
      }
      // self.block = { number: parseInt(blockNumber, 16) };
      dispatch({
        type: "SET_CURRENT_BLOCK",
        block: { number: parseInt(blockNumber, 16) }
      });
      dispatch(updateTx(storedTransaction));
      callback(null);
    }));
  };
}

module.exports = verifyTxSubmitted;
