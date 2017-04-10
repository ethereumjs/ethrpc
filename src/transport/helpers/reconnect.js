"use strict";

var pumpQueue = require("./pump-queue");

/**
 * Attempts to reconnect with exponential backoff.
 */
function reconnect(abstractTransport) {
  abstractTransport.connect(function (error) {
    if (error !== null) {
      setTimeout(reconnect.bind(this, abstractTransport), abstractTransport.backoffMilliseconds *= 2);
    } else {
      Object.keys(abstractTransport.reconnectListeners).forEach(function (key) {
        if (typeof abstractTransport.reconnectListeners[key] !== "function") {
          delete abstractTransport.reconnectListeners[key];
        } else {
          abstractTransport.reconnectListeners[key]();
        }
      });
      abstractTransport.connected = true;
      abstractTransport.backoffMilliseconds = 1;
      pumpQueue(abstractTransport);
    }
  });
}

module.exports = reconnect;
