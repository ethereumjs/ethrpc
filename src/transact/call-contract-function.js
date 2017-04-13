"use strict";

var clone = require("clone");
var callOrSendTransaction = require("../transact/call-or-send-transaction");
var convertResponseToReturnsType = require("../decode-response/convert-response-to-returns-type");
var handleRPCError = require("../decode-response/handle-rpc-error");
var isFunction = require("../utils/is-function");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");

/**
 * Invoke a function from a contract on the blockchain.
 * @typedef FirePayload
 * @type {object}
 * @property {!string} method
 * @property {?string} label
 * @property {!string} returns
 * @property {!string} from
 * @property {!string} to
 * @property {?string[]} params
 *
 * @param {FirePayload} payload
 * @param {function(object):void} callback - called with the result, possibly run through `wrapper` if applicable
 * @param {function(object,object):void} wrapper - a function to transform the result before it is passed to `callback`.  first parameter is result, second is `aux`
 * @param {object} aux - an optional parameter passed to `wrapper` (second parameter)
 */
function callContractFunction(payload, callback, wrapper, aux) {
  return function (dispatch) {
    var tx, res, err, converted;
    tx = clone(payload);
    if (!isFunction(callback)) {
      res = dispatch(callOrSendTransaction(tx));
      if (res === undefined || res === null) {
        throw new RPCError(errors.NO_RESPONSE);
      }
      err = handleRPCError(tx.method, tx.returns, res);
      if (err && err.error) throw new RPCError(err);
      converted = convertResponseToReturnsType(tx.returns, res);
      if (isFunction(wrapper)) return wrapper(converted, aux);
      return converted;
    }
    dispatch(callOrSendTransaction(tx, function (res) {
      var err, converted;
      if (res === undefined || res === null) {
        return callback(errors.NO_RESPONSE);
      }
      err = handleRPCError(tx.method, tx.returns, res);
      if (err && err.error) return callback(err);
      converted = convertResponseToReturnsType(tx.returns, res);
      if (isFunction(wrapper)) converted = wrapper(converted, aux);
      return callback(converted);
    }));
  };
}

module.exports = callContractFunction;
