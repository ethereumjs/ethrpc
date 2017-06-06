"use strict";

var HttpTransport = require("./http-transport");
var IpcTransport = require("./ipc-transport");
var Web3Transport = require("./web3-transport");
var SyncTransport = require("./sync-transport");
var WsTransport = require("./ws-transport");
var checkIfComplete = require("./helpers/check-if-complete");
var chooseTransport = require("./helpers/choose-transport");
var createArrayWithDefaultValue = require("../utils/create-array-with-default-value");

/**
 * Attempts to connect to all provided addresses and then picks the "best" of each transport type to return to you in the callback.
 *
 * @typedef Configuration
 * @type {object}
 * @property {!string[]} httpAddresses
 * @property {!string[]} wsAddresses
 * @property {!string[]} ipcAddresses
 * @property {!number} connectionTimeout
 *
 * @param {!Configuration} configuration
 * @param {!function(?Error,?object):void} messageHandler - Function to call when a message from the blockchain is received or an unrecoverable error occurs while attempting to talk to the blockchain.  The error will, if possible, contain the original request. Note: for SYNC requests, the provided handler is guaranteed to be called before blockchainRpc returns.
 * @param {!boolean} syncOnly - Whether or not to connect synchronously.  If true, only supports HTTP address in configuration.
 * @param {!boolean} debugLogging - Whether to log debug information to the console as part of the connect process.
 * @param {!function(?Error, ?Transporter):void} callback - Called when the transporter is ready to be used or an error occurs while hooking it up.
 * @returns {void}
 */
function Transporter(configuration, messageHandler, syncOnly, debugLogging, callback) {
  var resultAggregator, web3Transport;

  // validate configuration
  if (typeof configuration !== "object") {
    return callback(new Error("configuration must be an object."));
  } else if (!Array.isArray(configuration.httpAddresses)) {
    return callback(new Error("configuration.httpAddresses must be an array."));
  } else if (configuration.httpAddresses.some(function (x) { return typeof x !== "string"; })) {
    return callback(new Error("configuration.httpAddresses must contain only strings."));
  } else if (!Array.isArray(configuration.wsAddresses)) {
    return callback(new Error("configuration.wsAddresses must be an array."));
  } else if (configuration.wsAddresses.some(function (x) { return typeof x !== "string"; })) {
    return callback(new Error("configuration.wsAddresses must contain only strings."));
  } else if (!Array.isArray(configuration.ipcAddresses)) {
    return callback(new Error("configuration.ipcAddresses must be an array."));
  } else if (configuration.ipcAddresses.some(function (x) { return typeof x !== "string"; })) {
    return callback(new Error("configuration.ipcAddresses must contain only strings."));
  } else if (typeof configuration.connectionTimeout !== "number") {
    return callback(new Error("configuration.connectionTimeout must be a number."));
  }

  // default to all transports undefined, we will look for all of them becoming !== undefined to determine when we are done attempting all connects
  resultAggregator = {
    web3Transports: [undefined],
    ipcTransports: createArrayWithDefaultValue(configuration.ipcAddresses.length, undefined),
    wsTransports: createArrayWithDefaultValue(configuration.wsAddresses.length, undefined),
    httpTransports: createArrayWithDefaultValue(configuration.httpAddresses.length, undefined),
    syncTransports: createArrayWithDefaultValue(configuration.httpAddresses.length, undefined)
  };

  // set the internal state reasonable default values
  this.internalState = {
    web3Transport: null,
    httpTransport: null,
    wsTransport: null,
    ipcTransport: null,
    syncTransport: null,
    debugLogging: Boolean(debugLogging),
    nextReconnectListenerToken: 1,
    reconnectListeners: {}
  };

  if (syncOnly) {
    resultAggregator.web3Transports = [];
    if (configuration.wsAddresses.length !== 0) {
      throw new Error("Sync connect does not support any addresses other than HTTP.");
    }
    if (configuration.ipcAddresses.length !== 0) {
      throw new Error("Sync connect does not support any addresses other than HTTP.");
    }
    configuration.httpAddresses.forEach(function (httpAddress, index) {
      new SyncTransport(httpAddress, configuration.connectionTimeout, messageHandler, true, function (error, syncTransport) {
        resultAggregator.syncTransports[index] = (error !== null) ? null : syncTransport;
        // TODO: propagate the error up to the caller for reporting
        checkIfComplete(this, resultAggregator, callback);
        // instantiate an HttpTransport with all the same parameters, we don't need to worry about validating the connection since that is already done by now.
        // we want an HTTP transport because there are some necessarily async operations that need an async transport like background polling for blocks
        configuration.httpAddresses.forEach(function (httpAddress, index) {
          resultAggregator.httpTransports[index] = new HttpTransport(httpAddress, configuration.connectionTimeout, messageHandler, function () { });
          checkIfComplete(this, resultAggregator, callback);
        }.bind(this));
      }.bind(this));
    }.bind(this));
    return;
  }

  // initiate connections to all provided addresses, as each completes it will check to see if everything is done
  web3Transport = new Web3Transport(messageHandler, function (error) {
    // only use web3 transport if we're on mainnet (1) or public testnet (3)
    var networkID = parseInt(configuration.networkID, 10);
    var isMainnetOrPublicTestnet = !isNaN(networkID) && (networkID === 1 || networkID === 3);
    resultAggregator.web3Transports[0] = (error !== null || !isMainnetOrPublicTestnet) ? null : web3Transport;
    checkIfComplete(this, resultAggregator, callback);
  }.bind(this));
  configuration.ipcAddresses.forEach(function (ipcAddress, index) {
    var ipcTransport = new IpcTransport(ipcAddress, configuration.connectionTimeout, messageHandler, function (error) {
      resultAggregator.ipcTransports[index] = (error !== null) ? null : ipcTransport;
      // TODO: propagate the error up to the caller for reporting
      checkIfComplete(this, resultAggregator, callback);
    }.bind(this));
  }.bind(this));
  configuration.wsAddresses.forEach(function (wsAddress, index) {
    var wsTransport = new WsTransport(wsAddress, configuration.connectionTimeout, messageHandler, function (error) {
      resultAggregator.wsTransports[index] = (error !== null) ? null : wsTransport;
      // TODO: propagate the error up to the caller for reporting
      checkIfComplete(this, resultAggregator, callback);
    }.bind(this));
  }.bind(this));
  configuration.httpAddresses.forEach(function (httpAddress, index) {
    var httpTransport = new HttpTransport(httpAddress, configuration.connectionTimeout, messageHandler, function (error) {
      resultAggregator.httpTransports[index] = (error !== null) ? null : httpTransport;
      // TODO: propagate the error up to the caller for reporting
      checkIfComplete(this, resultAggregator, callback);
    }.bind(this));
  }.bind(this));
  configuration.httpAddresses.forEach(function (httpAddress, index) {
    var syncTransport = new SyncTransport(httpAddress, configuration.connectionTimeout, messageHandler, false, function (error) {
      resultAggregator.syncTransports[index] = (error !== null) ? null : syncTransport;
      // TODO: propagate the error up to the caller for reporting
      checkIfComplete(this, resultAggregator, callback);
    }.bind(this));
  }.bind(this));
}

/**
 * Submits a remote procedure call to the blockchain.
 *
 * @param {object} jso - RPC to make against the blockchain.  Assumed to already be validated.
 * @param {?string} requirements - ANY, SYNC or DUPLEX.  Will choose best available transport that meets the requirements.
 * @param {!boolean} debugLogging - Whether to log details about this request to the console.
 * @returns {void}
 */
Transporter.prototype.blockchainRpc = function (jso, requirements, debugLogging) {
  var chosenTransport = chooseTransport(this.internalState, requirements);
  if (debugLogging) {
    console.log("Blockchain RPC to " + chosenTransport.address + " via " + chosenTransport.constructor.name + " with payload: " + JSON.stringify(jso));
  }
  chosenTransport.submitWork(jso);
};

Transporter.prototype.addReconnectListener = function (callback) {
  var token = (this.internalState.nextReconnectListenerToken++).toString();
  this.internalState.reconnectListeners[token] = callback;
  return token;
};
Transporter.prototype.removeReconnectListener = function (token) {
  delete this.internalState.reconnectListeners[token];
};

module.exports = Transporter;
