"use strict";

var uuid = require("uuid");
var sha3 = require("../utils/sha3");
var transactAsync = require("./transact-async");
var callContractFunction = require("./call-contract-function");
var callOrSendTransaction = require("./call-or-send-transaction");
var wrapOnFailedCallback = require("./wrap-on-failed-callback");
var isFunction = require("../utils/is-function");
var isObject = require("../utils/is-object");
var noop = require("../utils/noop");
var RPCError = require("../errors/rpc-error");

/**
 * - call onSent when the transaction is broadcast to the network
 * - call onSuccess when the transaction has REQUIRED_CONFIRMATIONS
 * - call onFailed if the transaction fails
 */
function transact(payload, privateKeyOrSigner, accountType, onSent, onSuccess, onFailed) {
  return function (dispatch, getState) {
    payload.uuid = uuid.v4();
    var debug = getState().debug;
    if (debug.tx) console.log("ethrpc.transact payload:", payload);
    if (!isFunction(onSent) || !isFunction(onSuccess) || !isFunction(onFailed)) {
      return console.error("onSent, onSuccess, and onFailed callbacks not found", payload, privateKeyOrSigner, accountType, onSent, onSuccess, onFailed);
    }
    var wrappedOnFailedCallback = wrapOnFailedCallback(payload, onFailed, dispatch);
    if (!isObject(payload) || payload.to == null) {
      return onFailed(new RPCError("TRANSACTION_PAYLOAD_INVALID", { payload: payload }));
    }
    payload.send = false;
    if (payload.estimateGas) {
      return dispatch(callOrSendTransaction(payload, function (err, result) {
        if (err) return wrappedOnFailedCallback(err);
        if (result == null) return wrappedOnFailedCallback(new RPCError("NULL_CALL_RETURN"));
        return onSuccess(result);
      }));
    }
    if (payload.returns === "null") {
      return dispatch(transactAsync(payload, null, privateKeyOrSigner, accountType, onSent, onSuccess, wrappedOnFailedCallback));
    }
    dispatch(callContractFunction(payload, function (err, returnData) {
      if (debug.tx) console.log("returnData:", returnData);
      if (err) return wrappedOnFailedCallback(err);
      if (returnData == null) return wrappedOnFailedCallback(new RPCError("NULL_CALL_RETURN"));
      dispatch(transactAsync(payload, returnData, privateKeyOrSigner, accountType, onSent, onSuccess, wrappedOnFailedCallback));
    }));
  };
}

module.exports = transact;
