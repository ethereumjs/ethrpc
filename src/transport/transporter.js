"use strict";

var HttpTransport = require("./http-transport.js");
var IpcTransport = require("./ipc-transport.js");
var MetaMaskTransport = require("./metamask-transport.js");
var SyncTransport = require("./sync-transport.js");
var WsTransport = require("./ws-transport.js");

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
  // validate configuration
  if (typeof configuration !== "object") return callback(new Error("configuration must be an object."));
  if (!Array.isArray(configuration.httpAddresses)) return callback(new Error("configuration.httpAddresses must be an array."));
  if (configuration.httpAddresses.some(function (x) { return typeof x !== "string"; })) return callback(new Error("configuration.httpAddresses must contain only strings."));
  if (!Array.isArray(configuration.wsAddresses)) return callback(new Error("configuration.wsAddresses must be an array."));
  if (configuration.wsAddresses.some(function (x) { return typeof x !== "string"; })) return callback(new Error("configuration.wsAddresses must contain only strings."));
  if (!Array.isArray(configuration.ipcAddresses)) return callback(new Error("configuration.ipcAddresses must be an array."));
  if (configuration.ipcAddresses.some(function (x) { return typeof x !== "string"; })) return callback(new Error("configuration.ipcAddresses must contain only strings."));
  if (typeof configuration.connectionTimeout !== "number") return callback(new Error("configuration.connectionTimeout must be a number."));

  // default to all transports undefined, we will look for all of them becoming !== undefined to determine when we are done attempting all connects
  var resultAggregator = {
    metaMaskTransports: [undefined],
    ipcTransports: createArrayWithDefaultValue(configuration.ipcAddresses.length, undefined),
    wsTransports: createArrayWithDefaultValue(configuration.wsAddresses.length, undefined),
    httpTransports: createArrayWithDefaultValue(configuration.httpAddresses.length, undefined),
    syncTransports: createArrayWithDefaultValue(configuration.httpAddresses.length, undefined),
  };

  // set the internal state reasonable default values
  this.internalState = {
    metaMaskTransport: null,
    httpTransport: null,
    wsTransport: null,
    ipcTransport: null,
    syncTransport: null,
    outstandingRequests: {},
    debugLogging: !!debugLogging,
    nextReconnectListenerToken: 1,
    reconnectListeners: {},
  };

  if (syncOnly) {
    resultAggregator.metaMaskTransports = [];
    if (configuration.wsAddresses.length !== 0) throw new Error("Sync connect does not support any addresses other than HTTP.");
    if (configuration.ipcAddresses.length !== 0) throw new Error("Sync connect does not support any addresses other than HTTP.");
    configuration.httpAddresses.forEach(function (httpAddress, index) {
      /* jshint nonew: false */
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
  var metaMaskTransport = new MetaMaskTransport(messageHandler, function (error) {
    resultAggregator.metaMaskTransports[0] = (error !== null) ? null : metaMaskTransport;
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
  if (debugLogging) console.log("Blockchain RPC to " + chosenTransport.address + " via " + chosenTransport.constructor.name + " with payload: " + JSON.stringify(jso));
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

/**
 * Checks to see if result aggregation is complete and if so, calls the provided callback.
 */
function checkIfComplete(transporter, resultAggregator, onCompleteCallback) {
  var internalState = transporter.internalState;
  
  if (resultAggregator.metaMaskTransports.some(isUndefined)) return;
  if (resultAggregator.syncTransports.some(isUndefined)) return;
  if (resultAggregator.httpTransports.some(isUndefined)) return;
  if (resultAggregator.wsTransports.some(isUndefined)) return;
  if (resultAggregator.ipcTransports.some(isUndefined)) return;

  if (resultAggregator.syncTransports.every(isNull)
    && resultAggregator.metaMaskTransports.every(isNull)
    && resultAggregator.httpTransports.every(isNull)
    && resultAggregator.wsTransports.every(isNull)
    && resultAggregator.ipcTransports.every(isNull))
    return onCompleteCallback(new Error("Unable to connect to an Ethereum node via any tranpsort (MetaMask, HTTP, WS, IPC)."), null);

  internalState.metaMaskTransport = resultAggregator.metaMaskTransports.filter(isNotNull)[0] || null;
  internalState.syncTransport = resultAggregator.syncTransports.filter(isNotNull)[0] || null;
  internalState.httpTransport = resultAggregator.httpTransports.filter(isNotNull)[0] || null;
  internalState.wsTransport = resultAggregator.wsTransports.filter(isNotNull)[0] || null;
  internalState.ipcTransport = resultAggregator.ipcTransports.filter(isNotNull)[0] || null;

  if (internalState.debugLogging) {
    console.log("MetaMask: " + (internalState.metaMaskTransport ? "connected" : "not connected"));
    console.log("Sync: " + (internalState.syncTransport ? internalState.syncTransport.address : "not connected"));
    console.log("HTTP: " + (internalState.httpTransport ? internalState.httpTransport.address : "not connected"));
    console.log("WS: " + (internalState.wsTransport ? internalState.wsTransport.address : "not connected"));
    console.log("IPC: " + (internalState.ipcTransport ? internalState.ipcTransport.address : "not connected"));
  }

  // subscribe to reconnect callbacks for all transports
  [internalState.metaMaskTransport, internalState.ipcTransport, internalState.wsTransport, internalState.httpTransport, internalState.syncTransport].forEach(function (transport) {
    if (!transport) return;
    transport.addReconnectListener(function () {
      Object.keys(transporter.internalState.reconnectListeners).forEach(function (key) {
        transporter.internalState.reconnectListeners[key]();
      });
    });
  });

  onCompleteCallback(null, transporter);
}

/**
 * Choose the transport for this request given the requirements.
 * 
 * @param {!string} requirements - ANY, SYNC or DUPLEX.  Will choose best available transport that meets the requirements.
 * @returns {!AbstractTransport}
 */
function chooseTransport(internalState, requirements) {
  var eligibleTransports;
  switch (requirements) {
    case "ANY":
      eligibleTransports = [internalState.metaMaskTransport, internalState.ipcTransport, internalState.wsTransport, internalState.httpTransport];
      break;
    case "SYNC":
      eligibleTransports = [internalState.syncTransport];
      break;
    case "DUPLEX":
      eligibleTransports = [internalState.ipcTransport, internalState.wsTransport];
      break;
    default:
      throw new Error("requirements must be one of ANY, SYNC or DUPLEX");
  }
  eligibleTransports = eligibleTransports.filter(isNotNull);
  if (eligibleTransports.length <= 0) throw new Error("No transports available that meet the requirements (" + requirements + ").");
  return eligibleTransports[0];
}

function isUndefined(value) {
  return value === undefined;
}

function isNull(value) {
  return value === null;
}

function isNotNull(value) {
  return value !== null;
}

function createArrayWithDefaultValue(size, defaultValue) {
  return Array.apply(null, Array(size)).map(function () { return defaultValue; });
}

module.exports = Transporter;
