"use strict";

var clone = require("clone");
var speedomatic = require("speedomatic");
var callOrSendTransaction = require("../transact/call-or-send-transaction");
var handleRPCError = require("../decode-response/handle-rpc-error");
var isFunction = require("../utils/is-function");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");

/**
 * Invoke a function from a contract on the blockchain.
 * @typedef FirePayload
 * @type {object}
 * @property {!string} name
 * @property {!string} returns
 * @property {!string} from
 * @property {!string} to
 * @property {?string[]} params
 *
 * @param {FirePayload} payload
 * @param {function(object):void} callback - called with the result, possibly run through `callbackWrapper` if applicable
 * @param {function(object,object):void} callbackWrapper - a function to transform the result before it is passed to `callback`.  first parameter is result, second is `extraArgument`
 * @param {object} extraArgument - an optional parameter passed to `callbackWrapper` (second parameter)
 */
function callContractFunction(payload, callback, callbackWrapper, extraArgument) {
  return function (dispatch) {
    var tx = clone(payload);
    if (!isFunction(callback)) {
      var res = dispatch(callOrSendTransaction(tx));
      if (res == null) throw new RPCError(errors.NO_RESPONSE);
      var err = handleRPCError(tx.name, tx.returns, res);
      if (err && err.error) throw new RPCError(err);
      var converted = speedomatic.abiDecodeRpcResponse(tx.returns, res);
      if (isFunction(callbackWrapper)) return callbackWrapper(converted, extraArgument);
      return converted;
    }
    dispatch(callOrSendTransaction(tx, function (res) {
      var err, converted;
      if (res == null) return callback(errors.NO_RESPONSE);
      err = handleRPCError(tx.name, tx.returns, res);
      if (err && err.error) return callback(err);
      converted = speedomatic.abiDecodeRpcResponse(tx.returns, res);
      if (isFunction(callbackWrapper)) converted = callbackWrapper(converted, extraArgument);
      return callback(converted);
    }));
  };
}

module.exports = callContractFunction;
