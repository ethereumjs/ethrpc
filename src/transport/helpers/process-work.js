"use strict";

var reconnect = require("./reconnect");

/**
 * Processes one request off the head of the queue.
 */
var processWork = function (abstractTransport, rpcObject) {
  abstractTransport.submitRpcRequest(rpcObject, function (error) {
    if (error === null) return;
    if (error.retryable) {
      // if the error is retryable, put it back on the queue (at the head) and initiate reconnection in the background
      abstractTransport.workQueue.unshift(rpcObject);
      // if this is the first retriable failure then initiate a reconnect
      if (abstractTransport.connected) {
        abstractTransport.connected = false;
        reconnect(abstractTransport);
      }
    } else {
      // if we aren't going to retry the request, let the user know that something went wrong so they can handle it
      error.data = rpcObject;
      abstractTransport.messageHandler(error);
    }
  });
};

module.exports = processWork;
