/**
 * Send-call-confirm callback sequence
 */

"use strict";

var sha3 = require("../utils/sha3");
var transactAsync = require("../transact/transact-async");
var callContractFunction = require("../transact/call-contract-function");
var callOrSendTransaction = require("../transact/call-or-send-transaction");
var isFunction = require("../utils/is-function");
var noop = require("../utils/noop");
var RPCError = require("../errors/rpc-error");

function transact(payload, privateKeyOrSigner, accountType, onSent, onSuccess, onFailed) {
  return function (dispatch, getState) {
    var debug = getState().debug;
    if (debug.tx) console.log("payload transact:", payload);
    var onSentCallback = onSent;
    var onSuccessCallback = (isFunction(onSuccess)) ? onSuccess : noop;
    var onFailedCallback = function (response) {
      // notify subscribers of failed transaction
      dispatch({
        type: "TRANSACTION_FAILED",
        hash: (response && response.hash) || sha3(JSON.stringify(payload)),
      });
      if (isFunction(onFailed)) onFailed(response);
    };
    payload.send = false;
    if (payload.estimateGas) {
      return dispatch(callOrSendTransaction(payload, function (err, result) {
        if (err) return onFailedCallback(err);
        if (result == null) return onFailedCallback(new RPCError("NULL_CALL_RETURN"));
        return onSuccessCallback(result);
      }));
    }
    if (!isFunction(onSent)) return dispatch(callOrSendTransaction(payload));
    if (payload.returns === "null") {
      return dispatch(transactAsync(payload, null, privateKeyOrSigner, accountType, onSentCallback, onSuccessCallback, onFailedCallback));
    }
    dispatch(callContractFunction(payload, function (err, returnData) {
      if (debug.tx) console.log("returnData:", returnData);
      if (err) return onFailedCallback(returnData);
      if (returnData == null) return onFailedCallback(new RPCError("NULL_CALL_RETURN"));
      dispatch(transactAsync(payload, returnData, privateKeyOrSigner, accountType, onSentCallback, onSuccessCallback, onFailedCallback));
    }));
  };
}

module.exports = transact;
