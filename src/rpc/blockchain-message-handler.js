"use strict";

var parseEthereumResponse = require("../decode-response/parse-ethereum-response");
var isObject = require("../utils/is-object");
var RPCError = require("../errors/rpc-error");
var internalState = require("../internal-state");

/**
 * Used internally.  Processes a response from the blockchain by looking up the
 * associated callback and calling it.
 */
function blockchainMessageHandler(error, jso) {
  return function (dispatch, getState) {
    var state = getState();
    var subscriptions = state.subscriptions;
    var outOfBandErrorHandler = internalState.get("outOfBandErrorHandler");
    if (state.debug.broadcast) console.log("[ethrpc] RPC response:", JSON.stringify(jso));

    if (error !== null) {
      return outOfBandErrorHandler(error);
    }
    if (!isObject(jso)) {
      return outOfBandErrorHandler(new RPCError("INVALID_TRANSPORT_MESSAGE", jso));
    }

    var subscriptionHandler = function () {
      if (jso.method !== "eth_subscription") {
        return outOfBandErrorHandler(new RPCError("UNSUPPORTED_RPC_REQUEST", jso));
      }
      if (typeof jso.params.subscription !== "string") {
        return outOfBandErrorHandler(new RPCError("NO_SUBSCRIPTION_ID", jso));
      }
      if (jso.params.result === null || jso.params.result === undefined) {
        return outOfBandErrorHandler(new RPCError("NO_SUBSCRIPTION_RESULT", jso));
      }
      var subscription = subscriptions[jso.params.subscription];
      if (subscription != null) {
        dispatch({ type: subscription.reaction, data: jso });
      }
    };

    var responseHandler = function () {
      if (typeof jso.id !== "number") {
        return errorHandler(new RPCError("INVALID_MESSAGE_ID", jso));
      }
      var outstandingRequest = internalState.get("outstandingRequests." + jso.id);
      internalState.unset("outstandingRequests." + jso.id);
      if (!isObject(outstandingRequest)) {
        return outOfBandErrorHandler(new RPCError("JSON_RPC_REQUEST_NOT_FOUND", jso));
      }
      parseEthereumResponse(jso, outstandingRequest.callback);
    };

    var errorHandler = function () {
      // errors with IDs can go through the normal result process
      if (jso.id !== null && jso.id !== undefined) {
        if (state.debug.broadcast) console.log("outstanding request:", internalState.get("outstandingRequests." + jso.id));
        return responseHandler(jso);
      }
      outOfBandErrorHandler(new RPCError(jso.error));
    };

    // depending on the type of message it is (request, response, error, invalid) we will handle it differently
    if (jso.method !== undefined) {
      subscriptionHandler();
    } else if (jso.result !== undefined) {
      responseHandler();
    } else if (jso.error !== undefined) {
      errorHandler();
    } else {
      outOfBandErrorHandler(new RPCError("INVALID_JSON_RPC_MESSAGE", jso));
    }
  };
}

module.exports = blockchainMessageHandler;
