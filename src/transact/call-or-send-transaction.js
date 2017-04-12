"use strict";

var eth = require("../wrappers/eth");
var packageRequest = require("../encode-request/package-request");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");

/**
 * Payload format:
 * {
 *   from: <sender's address> (address)
 *   to: <contract address> (address)
 *   method: <function name> (string)
 *   signature: <function signature, e.g. "iia"> (string)
 *   params: <parameters passed to the function> (optional)
 *   returns: <"number[]", "int", "BigNumber", or "string" (default)>
 *   send: <true to sendTransaction, false to call (default)>
 * }
 */
function callOrSendTransaction(payload, callback) {
  return function (dispatch) {
    var invocation;
    if (!payload || payload.constructor !== Object) {
      if (!isFunction(callback)) return errors.TRANSACTION_FAILED;
      return callback(errors.TRANSACTION_FAILED);
    }
    invocation = (payload.send) ? eth.sendTransaction : eth.call;
    return dispatch(invocation(packageRequest(payload), callback));
  };
}

module.exports = callOrSendTransaction;
