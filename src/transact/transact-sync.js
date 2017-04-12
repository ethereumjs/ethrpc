"use strict";

var abi = require("augur-abi");
var BigNumber = require("bignumber.js");
var invoke = require("./invoke");
var verifyTxSubmitted = require("./verify-tx-submitted");
var pollForTxConfirmation = require("./poll-for-tx-confirmation");
var getLoggedReturnValue = require("./get-logged-return-value");
var fire = require("./fire");
var transact = require("./transact");
var handleRPCError = require("../decode-response/handle-rpc-error");
var convertResponseToReturnsType = require("../decode-response/convert-response-to-returns-type");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");
var constants = require("../constants");

/**
 * synchronous transact: block until the transaction is confirmed or fails
 * (don't use this in the browser or you will be a sad panda)
 */
function transactSync(payload) {
  return function (dispatch, getState) {
    var callReturn, returns, txHash, tx, receipt, log, e, debug;
    debug = getState().debug;
    if (payload.mutable || payload.returns === "null") {
      callReturn = null;
    } else {
      callReturn = dispatch(fire(payload));
      if (debug.tx) console.log("callReturn:", callReturn);
      if (callReturn === undefined || callReturn === null) {
        throw new RPCError(errors.NULL_CALL_RETURN);
      } else if (callReturn.error === "0x") {
        callReturn = null;
      } else if (callReturn.error) {
        throw new RPCError(callReturn);
      }
    }
    payload.send = true;
    returns = payload.returns;
    delete payload.returns;
    txHash = (payload.invoke || invoke)(payload);
    if (debug.tx) console.log("txHash:", txHash);
    if (!txHash && !payload.mutable && payload.returns !== "null") {
      throw new RPCError(errors.NULL_RESPONSE);
    } else if (txHash && txHash.error) {
      throw new RPCError(txHash);
    }
    payload.returns = returns;
    txHash = abi.format_int256(txHash);
    dispatch(verifyTxSubmitted(payload, txHash, callReturn));
    tx = dispatch(pollForTxConfirmation(txHash, null));
    if (tx === null) {
      payload.tries = (payload.tries) ? payload.tries + 1 : 1;
      if (payload.tries > constants.TX_RETRY_MAX) {
        throw new RPCError(errors.TRANSACTION_RETRY_MAX_EXCEEDED);
      }
      return dispatch(transact(payload));
    }
    tx.timestamp = parseInt(this.getBlock(tx.blockNumber, false).timestamp, 16);
    if (!payload.mutable) {
      tx.callReturn = callReturn;
      receipt = this.getTransactionReceipt(txHash);
      if (debug.tx) console.log("got receipt:", receipt);
      if (receipt && receipt.gasUsed) {
        tx.gasFees = abi.unfix(new BigNumber(receipt.gasUsed, 16).times(new BigNumber(tx.gasPrice, 16)), "string");
      }
      return tx;
    }

    // if mutable return value, then lookup logged return value in transaction
    // receipt (after confirmation)
    log = dispatch(getLoggedReturnValue(txHash));
    e = handleRPCError(payload.method, payload.returns, log.returnValue);
    if (e && e.error) {
      e.gasFees = abi.unfix(log.gasUsed.times(new BigNumber(tx.gasPrice, 16)), "string");
      if (e.error !== errors.NULL_CALL_RETURN.error) {
        throw new RPCError(e);
      }
      callReturn = dispatch(fire(payload));
      throw new RPCError(handleRPCError(payload.method, payload.returns, callReturn));
    }
    tx.callReturn = convertResponseToReturnsType(payload.returns, log.returnValue);
    tx.gasFees = abi.unfix(log.gasUsed.times(new BigNumber(tx.gasPrice, 16)), "string");
    return tx;
  };
}

module.exports = transactSync;
