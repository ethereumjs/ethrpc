"use strict";

var assign = require("lodash.assign");
var speedomatic = require("speedomatic");
var callOrSendTransaction = require("../transact/call-or-send-transaction");
var handleRPCError = require("../decode-response/handle-rpc-error");

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
      if (err) {
        var handledError = handleRPCError(payload.returns, err); // TODO is this needed...?
        if (handledError && handledError.error) return callback(handledError);
        // return callback(err); // TODO could just use this instead...?
      }
      callback(null, speedomatic.abiDecodeRpcResponse(payload.returns, result));
    }));
  };
}

module.exports = callContractFunction;
