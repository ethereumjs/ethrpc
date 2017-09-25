"use strict";

var speedomatic = require("speedomatic");
var BigNumber = require("bignumber.js");
var eth = require("../wrappers/eth");
var getLoggedReturnValue = require("../transact/get-logged-return-value");
var callContractFunction = require("../transact/call-contract-function");
var handleRPCError = require("../decode-response/handle-rpc-error");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");
var constants = require("../constants");

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID, ROUNDING_MODE: BigNumber.ROUND_HALF_DOWN });

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
          dispatch({
            type: "UPDATE_TRANSACTION",
            hash: txHash,
            data: { tx: { callReturn: transaction.tx.callReturn } }
          });
          dispatch(eth.getTransactionReceipt(txHash, function (receipt) {
            if (debug.tx) console.log("got receipt:", receipt);
            if (receipt && receipt.gasUsed) {
              dispatch({
                type: "UPDATE_TRANSACTION",
                hash: txHash,
                data: {
                  tx: {
                    gasFees: speedomatic.unfix(new BigNumber(receipt.gasUsed, 16).times(new BigNumber(transaction.tx.gasPrice, 16)), "string")
                  }
                }
              });
            }
            dispatch({ type: "UNLOCK_TRANSACTION", hash: txHash });
            transaction.onSuccess(getState().transactions[txHash].tx);
          }));
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
