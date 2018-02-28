"use strict";

var clone = require("clone");
var assign = require("lodash.assign");
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
 * @property {!string} returns
 * @property {!string} from
 * @property {!string} to
 * @property {?string[]} params
 *
 * @param {FirePayload} payload
 * @param {function(object):void} callback - called with the result.
 */
function callContractFunction(payload, callback) {
  return function (dispatch) {
    dispatch(callOrSendTransaction(assign({}, payload), function (err, result) {
      if (result == null) return callback(new RPCError(errors.NO_RESPONSE));
      var err = handleRPCError(payload.returns, result);
      if (err && err.error) return callback(err);
      return callback(null, speedomatic.abiDecodeRpcResponse(payload.returns, result));
    }));
  };
}

module.exports = callContractFunction;
