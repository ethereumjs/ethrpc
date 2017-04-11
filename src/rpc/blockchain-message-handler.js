"use strict";

/**
 * Used internally.  Processes a response from the blockchain by looking up the
 * associated callback and calling it.
 */
function blockchainMessageHandler(error, jso) {
  return function (dispatch, getState) {
    var subscriptionHandler, responseHandler, errorHandler, configuration, subscriptions;
    configuration = getState().configuration;
    subscriptions = getState().subscriptions;

    if (error !== null) {
      return configuration.errorHandler(error);
    }
    if (typeof jso !== "object") {
      return configuration.errorHandler(new ErrorWithData("Unexpectedly received a message from the transport that was not an object.", jso));
    }

    subscriptionHandler = function () {
      var subscriptionCallback;
      if (jso.method !== "eth_subscription") {
        return configuration.errorHandler(new ErrorWithData("Received an RPC request that wasn't an `eth_subscription`.", jso));
      }
      if (typeof jso.params.subscription !== "string") {
        return configuration.errorHandler(new ErrorWithData("Received an `eth_subscription` request without a subscription ID.", jso));
      }
      if (jso.params.result === null || jso.params.result === undefined) {
        return configuration.errorHandler(new ErrorWithData("Received an `eth_subscription` request without a result.", jso));
      }

      subscriptionCallback = subscriptions[jso.params.subscription];
      if (subscriptionCallback) subscriptionCallback(jso.params.result);
    };

    responseHandler = function () {
      var outstandingRequest;
      if (typeof jso.id !== "number") {
        return errorHandler(new ErrorWithData("Received a message from the blockchain that didn't have a valid id.", jso));
      }
      outstandingRequest = getState().outstandingRequests[jso.id];
      dispatch({ type: "REMOVE_OUTSTANDING_REQUEST", id: jso.id });
      // outstandingRequest = this.internalState.outstandingRequests[jso.id];
      // delete this.internalState.outstandingRequests[jso.id];
      if (typeof outstandingRequest !== "object") {
        return configuration.errorHandler(new ErrorWithData("Unable to locate original request for blockchain response.", jso));
      }

      // FIXME: outstandingRequest.callback should be function(Error,object) not function(Error|object)
      parseEthereumResponse(jso, outstandingRequest.expectedReturnTypes, outstandingRequest.callback);
    };

    errorHandler = function () {
      // errors with IDs can go through the normal result process
      if (jso.id !== null && jso.id !== undefined) {
        return responseHandler(jso);
      }
      configuration.errorHandler(new ErrorWithCodeAndData(jso.error.message, jso.error.code, jso.error.data));
    };

    // depending on the type of message it is (request, response, error, invalid) we will handle it differently
    if (jso.method !== undefined) {
      subscriptionHandler();
    } else if (jso.result !== undefined) {
      responseHandler();
    } else if (jso.error !== undefined) {
      errorHandler();
    } else {
      configuration.errorHandler(new ErrorWithData("Received an invalid JSON-RPC message.", jso));
    }
  };
}

module.exports = blockchainMessageHandler;
