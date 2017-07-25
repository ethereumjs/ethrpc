"use strict";

var eth = require("../wrappers/eth");
var packageRequest = require("../encode-request/package-request");
var isFunction = require("../utils/is-function");
var isObject = require("../utils/is-object");
var errors = require("../errors/codes");

/**
 * Payload format:
 * {
 *   from: <sender's address> (address)
 *   to: <contract address> (address)
 *   name: <function name> (string)
 *   signature: <function signature, e.g. "iia"> (string)
 *   params: <parameters passed to the function> (optional)
 *   returns: <"number[]", "int", "BigNumber", or "string" (default)>
 *   send: <true to sendTransaction, false to call (default)>
 * }
 */
function callOrSendTransaction(payload, callback) {
  return function (dispatch, getState) {
    var packaged;
    if (!isObject(payload)) {
      if (!isFunction(callback)) return errors.TRANSACTION_FAILED;
      return callback(errors.TRANSACTION_FAILED);
    }
    packaged = packageRequest(payload);
    if (getState().debug.broadcast) console.log("packaged:", packaged);
    if (payload.send) {
      return dispatch(eth.sendTransaction(packageRequest(payload), callback));
    }
    return dispatch(eth.call([packageRequest(payload), "latest"], callback));
  };
}

module.exports = callOrSendTransaction;
