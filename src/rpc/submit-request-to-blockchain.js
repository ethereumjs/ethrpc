"use strict";

var stripReturnsTypeAndInvocation = require("../encode-request/strip-returns-type-and-invocation");
var isFunction = require("../utils/is-function");
var internalState = require("../internal-state");

/**
 * Used internally.  Submits a remote procedure call to the blockchain.
 *
 * @param {!object} jso - The JSON-RPC call to make.
 * @param {?function(?Error, ?object):void} callback - Called when a response to the request is received.
 */
function submitRequestToBlockchain(jso, callback) {
  return function (dispatch, getState) {
    var debug = getState().debug;
    if (!isFunction(callback)) {
      if (debug.broadcast) console.log("callback not found for request", jso);
      throw new Error("callback must be a function");
    }
    if (typeof jso !== "object") return callback(new Error("jso must be an object"));
    if (typeof jso.id !== "number") return callback(new Error("jso.id must be a number"));
    var expectedReturnTypes = stripReturnsTypeAndInvocation(jso); // FIXME: return types shouldn't be embedded into the RPC JSO
    internalState.set("outstandingRequests." + jso.id, {
      jso: jso,
      expectedReturnTypes: expectedReturnTypes,
      callback: callback,
    });
    internalState.get("transporter").blockchainRpc(jso, debug.broadcast);
  };
}

module.exports = submitRequestToBlockchain;
