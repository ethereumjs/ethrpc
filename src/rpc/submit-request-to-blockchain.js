"use strict";

var stripReturnsTypeAndInvocation = require("../encode-request/strip-returns-type-and-invocation");
var isFunction = require("../utils/is-function");
var internalState = require("../internal-state");

/**
 * Used internally.  Submits a remote procedure call to the blockchain.
 *
 * @param {!object} jso - The JSON-RPC call to make.
 * @param {?string} transportRequirements - ANY or DUPLEX.  Will choose best available transport that meets the requirements.
 * @param {?function(?Error, ?object):void} callback - Called when a response to the request is received.
 */
function submitRequestToBlockchain(jso, transportRequirements, callback) {
  return function (dispatch, getState) {
    var debug = getState().debug;
    if (isFunction(transportRequirements) && !callback) {
      callback = transportRequirements;
      transportRequirements = null;
    }
    if (!isFunction(callback)) throw new Error("callback must be a function");
    if (typeof transportRequirements !== "string" && transportRequirements !== null) {
      return callback(new Error("transportRequirements must be null or a string"));
    }
    if (typeof jso !== "object") return callback(new Error("jso must be an object"));
    if (typeof jso.id !== "number") return callback(new Error("jso.id must be a number"));
    var expectedReturnTypes = stripReturnsTypeAndInvocation(jso); // FIXME: return types shouldn't be embedded into the RPC JSO
    internalState.set("outstandingRequests." + jso.id, {
      jso: jso,
      expectedReturnTypes: expectedReturnTypes,
      callback: callback,
    });
    internalState.get("transporter").blockchainRpc(jso, transportRequirements, debug.broadcast);
  };
}

module.exports = submitRequestToBlockchain;
