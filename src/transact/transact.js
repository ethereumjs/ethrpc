/**
 * Send-call-confirm callback sequence
 */

"use strict";

var transactAsync = require("../transact/transact-async");
var transactSync = require("../transact/transact-sync");
var callContractFunction = require("../transact/call-contract-function");
var wrapTransactionRelayCallback = require("../transaction-relay/wrap-transaction-relay-callback");
var isFunction = require("../utils/is-function");
var noop = require("../utils/noop");
var errors = require("../errors/codes");

function transact(payload, onSent, onSuccess, onFailed) {
  return function (dispatch, getState) {
    var cb, state;
    state = getState();
    if (state.debug.tx) console.log("payload transact:", payload);
    payload.send = false;

    // synchronous / blocking transact sequence
    if (!isFunction(onSent)) return dispatch(transactSync(payload));

    // asynchronous / non-blocking transact sequence
    cb = (isFunction(state.transactionRelay)) ? {
      sent: dispatch(wrapTransactionRelayCallback("sent", payload, onSent)),
      success: dispatch(wrapTransactionRelayCallback("success", payload, onSuccess)),
      failed: dispatch(wrapTransactionRelayCallback("failed", payload, onFailed))
    } : {
      sent: onSent,
      success: (isFunction(onSuccess)) ? onSuccess : noop,
      failed: (isFunction(onFailed)) ? onFailed : noop
    };
    if (payload.mutable || payload.returns === "null") {
      return dispatch(transactAsync(payload, null, cb.sent, cb.success, cb.failed));
    }
    dispatch(callContractFunction(payload, function (callReturn) {
      if (state.debug.tx) console.log("callReturn:", callReturn);
      if (callReturn === undefined || callReturn === null) {
        return cb.failed(errors.NULL_CALL_RETURN);
      } else if (callReturn.error) {
        return cb.failed(callReturn);
      }
      dispatch(transactAsync(payload, callReturn, cb.sent, cb.success, cb.failed));
    }));
  };
}

module.exports = transact;
