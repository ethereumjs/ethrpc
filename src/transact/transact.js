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
var errors = require("../errors/codes");

function transact(payload, privateKeyOrSigner, accountType, onSent, onSuccess, onFailed) {
  return function (dispatch, getState) {
    var onSentCallback, onSuccessCallback, onFailedCallback, debug = getState().debug;
    if (debug.tx) console.log("payload transact:", payload);
    if (!isFunction(onSent)) return dispatch(callOrSendTransaction(payload));
    onSentCallback = onSent;
    onSuccessCallback = (isFunction(onSuccess)) ? onSuccess : noop;
    onFailedCallback = function (response) {
      // notify subscribers of failed transaction
      dispatch({
        type: "TRANSACTION_FAILED",
        hash: (response && response.hash) || sha3(JSON.stringify(payload))
      });
      if (isFunction(onFailed)) onFailed(response);
    };
    payload.send = false;
    if (payload.mutable || payload.returns === "null") {
      return dispatch(transactAsync(payload, null, privateKeyOrSigner, accountType, onSentCallback, onSuccessCallback, onFailedCallback));
    }
    dispatch(callContractFunction(payload, function (callReturn) {
      if (debug.tx) console.log("callReturn:", callReturn);
      if (callReturn == null) {
        return onFailedCallback(errors.NULL_CALL_RETURN);
      } else if (callReturn.error) {
        return onFailedCallback(callReturn);
      }
      dispatch(transactAsync(payload, callReturn, privateKeyOrSigner, accountType, onSentCallback, onSuccessCallback, onFailedCallback));
    }));
  };
}

module.exports = transact;
