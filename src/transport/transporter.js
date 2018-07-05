"use strict";

var HttpTransport = require("./http-transport");
var IpcTransport = require("./ipc-transport");
var Web3Transport = require("./web3-transport");
var WsTransport = require("./ws-transport");
var storeTransport = require("./helpers/store-transport");
var chooseTransport = require("./helpers/choose-transport");
var someSeries = require("async/someSeries");

/**
 * Attempts to connect to all provided addresses and then picks the "best" of each transport type to return to you in the callback.
 *
 * @typedef Configuration
 * @type {object}
 * @property {!string[]} httpAddresses
 * @property {!string[]} wsAddresses
 * @property {!string[]} ipcAddresses
 * @property {!number} connectionTimeout
 * @property {!boolean} useWeb3Transport
 *
 * @param {!Configuration} configuration
 * @param {!function(?Error,?object):void} messageHandler - Function to call when a message from the blockchain is received or an unrecoverable error occurs while attempting to talk to the blockchain.  The error will, if possible, contain the original request.
 * @param {!boolean} debugLogging - Whether to log debug information to the console as part of the connect process.
 * @param {!function(?Error, ?Transporter):void} callback - Called when the transporter is ready to be used or an error occurs while hooking it up.
 * @returns {void}
 */
function Transporter(configuration, messageHandler, debugLogging, callback) {
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

  // set the internal state reasonable default values
  this.internalState = {
    debugLogging: Boolean(debugLogging),
    nextListenerToken: 1,
    reconnectListeners: {},
    disconnectListeners: {},
  };

  // initiate connections to all provided addresses, only callback one that connects
  someSeries([
    function (nextTransport) {
      if (configuration.ipcAddresses.length === 0 || configuration.useWeb3Transport === true) return nextTransport(null);
      someSeries(configuration.ipcAddresses,
        function (ipcAddress, nextAddress) {
          try {
            var ipcTransport = new IpcTransport(ipcAddress, configuration.connectionTimeout, messageHandler, function (error) {
              if (error !== null) return nextAddress(null);
              return nextAddress(ipcTransport);
            });
          } catch (err) {
            console.warn(ipcAddress, err.message);
            nextAddress(null);
          }
        },
        nextTransport);
    },
    function (nextTransport) {
      if (configuration.wsAddresses.length === 0 || configuration.useWeb3Transport === true) return nextTransport(null);
      someSeries(configuration.wsAddresses,
        function (wsAddress, nextAddress) {
          try {
            var wsTransport = new WsTransport(wsAddress, configuration.connectionTimeout, configuration.websocketClientConfig, messageHandler, function (error) {
              if (error !== null) return nextAddress(null);
              return nextAddress(wsTransport);
            });
          } catch (err) {
            console.warn(wsAddress, err.message);
            nextAddress(null);
          }
        },
        nextTransport);
    },
    function (nextTransport) {
      if (configuration.httpAddresses.length === 0 || configuration.useWeb3Transport === true) return nextTransport(null);
      someSeries(configuration.httpAddresses,
        function (httpAddress, nextAddress) {
          try {
            var httpTransport = new HttpTransport(httpAddress, configuration.connectionTimeout, messageHandler, function (error) {
              if (error !== null) return nextAddress(null);
              return nextAddress(httpTransport);
            });
          } catch (err) {
            console.warn(httpAddress, err.message);
            nextAddress(null);
          }
        },
        nextTransport);
    },
    function (nextTransport) {
      if (configuration.useWeb3Transport !== true) return nextTransport();
      var web3Transport = new Web3Transport(messageHandler, function (error) {
        if (error !== null) return nextTransport(null);
        return nextTransport(web3Transport);
      });
    },
  ],
  function (tryTransportType, nextTransportType) {
    tryTransportType(nextTransportType);
  }, function (foundTransport) {
    if (!foundTransport) {
      return callback(new Error("Unable to connect to an Ethereum node via any transport. (Web3, HTTP, WS, IPC)."));
    }
    storeTransport(this.internalState, foundTransport);
    callback(null, this);
  }.bind(this));
}

Transporter.prototype.resetState = function () {
  if (this.internalState.transport) this.internalState.transport.resetState();
};

/**
 * Submits a remote procedure call to the blockchain.
 *
 * @param {object} jso - RPC to make against the blockchain.  Assumed to already be validated.
 * @param {!boolean} debugLogging - Whether to log details about this request to the console.
 * @returns {void}
 */
Transporter.prototype.blockchainRpc = function (jso, debugLogging) {
  var chosenTransport = chooseTransport(this.internalState);
  if (debugLogging) {
    console.log("Blockchain RPC to " + chosenTransport.address + " via " + chosenTransport.constructor.name + " with payload: " + JSON.stringify(jso));
  }
  chosenTransport.submitWork(jso);
};

Transporter.prototype.addReconnectListener = function (callback) {
  var token = (this.internalState.nextListenerToken++).toString();
  this.internalState.reconnectListeners[token] = callback;
  return token;
};
Transporter.prototype.removeReconnectListener = function (token) {
  delete this.internalState.reconnectListeners[token];
};
Transporter.prototype.addDisconnectListener = function (callback) {
  var token = (this.internalState.nextListenerToken++).toString();
  this.internalState.disconnectListeners[token] = callback;
  return token;
};
Transporter.prototype.removeDisconnectListener = function (token) {
  delete this.internalState.disconnectListeners[token];
};

module.exports = Transporter;
