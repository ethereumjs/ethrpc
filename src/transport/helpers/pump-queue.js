"use strict";

var processWork = require("./process-work");

/**
 * Pumps the current work queue.
 */
function pumpQueue(abstractTransport) {
  var rpcObject;
  abstractTransport.awaitingPump = false;
  while ((rpcObject = abstractTransport.workQueue.shift())) {
    // it is possible to lose a connection while iterating over the queue, if that happens unroll the latest iteration and stop pumping (reconnect will start pumping again)
    if (!abstractTransport.connected) {
      abstractTransport.workQueue.unshift(rpcObject);
      return;
    }
    processWork(abstractTransport, rpcObject);
  }
}

module.exports = pumpQueue;
