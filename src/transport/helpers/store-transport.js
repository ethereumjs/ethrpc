"use strict";

/**
 * Stores transport, adds listeners
 */
function storeTransport(internalState, transport) {
  // subscribe to disconnect/reconnect callbacks for transport
  internalState.transport = transport;
  transport.addReconnectListener(function () {
    Object.keys(internalState.reconnectListeners).forEach(function (key) {
      internalState.reconnectListeners[key]();
    });
  });
  transport.addDisconnectListener(function (event) {
    Object.keys(internalState.disconnectListeners).forEach(function (key) {
      internalState.disconnectListeners[key](event);
    });
  });
}

module.exports = storeTransport;
