"use strict";

var parseEthereumResponse = require("../decode-response/parse-ethereum-response");
var isObject = require("../utils/is-object");
var ErrorWithData = require("../errors").ErrorWithData;
var ErrorWithCodeAndData = require("../errors").ErrorWithCodeAndData;
var internalState = require("../internal-state");

/**
 * Used internally.  Processes a response from the blockchain by looking up the
 * associated callback and calling it.
 */
function blockchainMessageHandler(error, jso) {
  return function (dispatch, getState) {
    var outOfBandErrorHandler, subscriptionHandler, responseHandler, errorHandler, subscriptions, state = getState();
    subscriptions = state.subscriptions;
    outOfBandErrorHandler = internalState.get("outOfBandErrorHandler");

    if (error !== null) {
      return outOfBandErrorHandler(error);
    }
    if (typeof jso !== "object") {
      return outOfBandErrorHandler(new ErrorWithData("Unexpectedly received a message from the transport that was not an object.", jso));
    }

    subscriptionHandler = function () {
      var subscription;
      if (jso.method !== "eth_subscription") {
        return outOfBandErrorHandler(new ErrorWithData("Received an RPC request that wasn't an `eth_subscription`.", jso));
      }
      if (typeof jso.params.subscription !== "string") {
        return outOfBandErrorHandler(new ErrorWithData("Received an `eth_subscription` request without a subscription ID.", jso));
      }
      if (jso.params.result === null || jso.params.result === undefined) {
        return outOfBandErrorHandler(new ErrorWithData("Received an `eth_subscription` request without a result.", jso));
      }
      subscription = subscriptions[jso.params.subscription];
      if (subscription != null) {
        dispatch({ type: subscription.reaction, data: jso });
      }
    };

    responseHandler = function () {
      var outstandingRequest;
      if (typeof jso.id !== "number") {
        return errorHandler(new ErrorWithData("Received a message from the blockchain that didn't have a valid id.", jso));
      }
      outstandingRequest = internalState.get("outstandingRequests." + jso.id);
      internalState.unset("outstandingRequests." + jso.id);
      if (!isObject(outstandingRequest)) {
        return outOfBandErrorHandler(new ErrorWithData("Unable to locate original request for blockchain response.", jso));
      }

      // FIXME: outstandingRequest.callback should be function(Error,object) not function(Error|object)
      parseEthereumResponse(jso, outstandingRequest.expectedReturnTypes, outstandingRequest.callback);
    };

    errorHandler = function () {
      // errors with IDs can go through the normal result process
      if (jso.id !== null && jso.id !== undefined) {
        return responseHandler(jso);
      }
      outOfBandErrorHandler(new ErrorWithCodeAndData(jso.error.message, jso.error.code, jso.error.data));
    };

    // depending on the type of message it is (request, response, error, invalid) we will handle it differently
    if (jso.method !== undefined) {
      subscriptionHandler();
    } else if (jso.result !== undefined) {
      responseHandler();
    } else if (jso.error !== undefined) {
      errorHandler();
    } else {
      outOfBandErrorHandler(new ErrorWithData("Received an invalid JSON-RPC message.", jso));
    }
  };
}

module.exports = blockchainMessageHandler;
