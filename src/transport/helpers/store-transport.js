"use strict";

/**
 * Stores transport, adds listeners
 */
function storeTransport(transporter, transport, onCompleteCallback) {
  // subscribe to disconnect/reconnect callbacks for transport
  if (!transport) return onCompleteCallback(new Error("Unable to connect to an Ethereum node via any transport. (Web3, HTTP, WS, IPC)."), null);
  transporter.internalState.transport = transport;
  transport.addReconnectListener(function () {
    Object.keys(transporter.internalState.reconnectListeners).forEach(function (key) {
      transporter.internalState.reconnectListeners[key]();
    });
  });
  transport.addDisconnectListener(function () {
    Object.keys(transporter.internalState.disconnectListeners).forEach(function (key) {
      transporter.internalState.disconnectListeners[key]();
    });
  });
  onCompleteCallback(null, transporter);
}

module.exports = storeTransport;
