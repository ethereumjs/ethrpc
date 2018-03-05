"use strict";

var speedomatic = require("speedomatic");
var BigNumber = require("bignumber.js");
var eth = require("../wrappers/eth");
var RPCError = require("../errors/rpc-error");
var constants = require("../constants");

function updateSealedTransaction(transactionHash, callback) {
  return function (dispatch, getState) {
    dispatch({ type: "SET_TRANSACTION_CONFIRMATIONS", hash: transactionHash, currentBlockNumber: parseInt(getState().currentBlock.number, 16) });
    var transaction = getState().transactions[transactionHash];
    if (transaction.confirmations < constants.REQUIRED_CONFIRMATIONS) return callback(null);
    dispatch({ type: "TRANSACTION_CONFIRMED", hash: transactionHash });
    dispatch(eth.getBlockByNumber([transaction.tx.blockNumber, false], function (err, block) {
      if (err) return callback(err);
      if (block == null) {
        console.warn("No block found for block number", transaction.tx.blockNumber);
        return callback(new RPCError("BLOCK_NOT_FOUND"));
      }
      dispatch({ type: "UPDATE_ON_CHAIN_TRANSACTION", hash: transactionHash, data: { timestamp: parseInt(block.timestamp, 16) } });
      dispatch({ type: "UPDATE_ON_CHAIN_TRANSACTION", hash: transactionHash, data: { callReturn: transaction.tx.callReturn } });
      dispatch(eth.getTransactionReceipt(transactionHash, function (err, receipt) {
        if (getState().debug.tx) console.log("eth_getTransactionReceipt", transactionHash, err, receipt);
        if (err) return callback(err);
        if (receipt == null) return callback(new RPCError("TRANSACTION_RECEIPT_NOT_FOUND"));
        var gasFees = speedomatic.unfix(new BigNumber(receipt.gasUsed, 16).times(new BigNumber(transaction.tx.gasPrice, 16)), "string");
        dispatch({ type: "UPDATE_ON_CHAIN_TRANSACTION", hash: transactionHash, data: { gasFees: gasFees } });
        var status = parseInt(receipt.status, 16);
        if (status === 0) { // status 0x0: failure
          callback(getState().transactions[transactionHash].tx);
        } else if (status === 1) { // status 0x1: success
          transaction.onSuccess(getState().transactions[transactionHash].tx);
          callback(null);
        }
      }));
    }));
  };
}

module.exports = updateSealedTransaction;
