"use strict";

var isUndefined = require("../../utils/is-undefined");
var isNull = require("../../utils/is-null");
var isNotNull = require("../../utils/is-not-null");

/**
 * Checks to see if result aggregation is complete and if so, calls the provided callback.
 */
function checkIfComplete(transporter, resultAggregator, onCompleteCallback) {
  var internalState = transporter.internalState;

  if (resultAggregator.web3Transports.every(isNull)
    && resultAggregator.httpTransports.every(isNull)
    && resultAggregator.wsTransports.every(isNull)
    && resultAggregator.ipcTransports.every(isNull)) {
    return onCompleteCallback(new Error("Unable to connect to an Ethereum node via any transport. (Web3, HTTP, WS, IPC)."), null);
  }

  internalState.web3Transport = resultAggregator.web3Transports.filter(isNotNull)[0] || null;
  internalState.httpTransport = resultAggregator.httpTransports.filter(isNotNull)[0] || null;
  internalState.wsTransport = resultAggregator.wsTransports.filter(isNotNull)[0] || null;
  internalState.ipcTransport = resultAggregator.ipcTransports.filter(isNotNull)[0] || null;

  if (internalState.debugLogging) {
    console.log("Web3: " + (internalState.web3Transport ? "connected" : "not connected"));
    console.log("HTTP: " + (internalState.httpTransport ? internalState.httpTransport.address : "not connected"));
    console.log("WS: " + (internalState.wsTransport ? internalState.wsTransport.address : "not connected"));
    console.log("IPC: " + (internalState.ipcTransport ? internalState.ipcTransport.address : "not connected"));
  }

  // subscribe to disconnect/reconnect callbacks for all transports
  [internalState.web3Transport, internalState.ipcTransport, internalState.wsTransport, internalState.httpTransport].forEach(function (transport) {
    if (!transport) return;
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
  });

  onCompleteCallback(null, transporter);
}

module.exports = checkIfComplete;
