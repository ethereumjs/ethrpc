"use strict";

var async = require("async");
var net_version = require("./wrappers/net").version;
var setGasPrice = require("./wrappers/set-gas-price");
var setCoinbase = require("./wrappers/set-coinbase");
var Transporter = require("./transport/transporter");
var ensureLatestBlock = require("./block-management/ensure-latest-block");
var startBlockStream = require("./start-block-stream");
var validateConfiguration = require("./validate/validate-configuration");
var resetState = require("./reset-state");
var isFunction = require("./utils/is-function");
var logError = require("./utils/log-error");
var internalState = require("./internal-state");
var RPCError = require("./errors/rpc-error");

/**
 * Initiates a connection to Ethereum.  This must be called before any other methods are called.
 *
 * @typedef configuration
 * @type {object}
 * @property {?string[]} httpAddresses
 * @property {?string[]} wsAddresses
 * @property {?string[]} ipcAddresses
 * @property {?number} connectionTimeout
 * @property {?number} pollingIntervalMilliseconds
 * @property {?number} blockRetention
 * @property {!function(Error):void} errorHandler - called when an otherwise unhandled asynchronous error occurs during the course of operation.
 *
 * @param {!configuration} configuration
 * @param {!function(?Error):void} initialConnectCallback - if the error parameter is null then the connection was successful
 * @returns {void}
 */
function connect(configuration, initialConnectCallback) {
  return function (dispatch, getState) {
    dispatch(resetState());

    // Use logError (console.error) as default out-of-band error handler if not set
    if (!isFunction(configuration.errorHandler)) configuration.errorHandler = logError;
    internalState.set("outOfBandErrorHandler", configuration.errorHandler);
    dispatch({ type: "SET_CONFIGURATION", configuration: validateConfiguration(configuration) });

    // initialize the transporter, this will be how we send to and receive from the blockchain
    var storedConfiguration = getState().configuration;
    new Transporter(storedConfiguration, internalState.get("shimMessageHandler"), getState().debug.connect, function (err, transporter) {
      if (err) return initialConnectCallback(err);
      internalState.set("transporter", transporter);

      // ensure we can do basic JSON-RPC over this connection
      dispatch(net_version(null, function (err, networkID) {
        if (err) return initialConnectCallback(err);
        if (networkID == null) return initialConnectCallback(new RPCError("NO_RESPONSE"));

        // If configuration.networkID is provided, verify that we're actually on that network
        if (configuration.networkID && parseInt(networkID, 10) !== parseInt(configuration.networkID, 10)) {
          return initialConnectCallback(networkID);
        }

        dispatch({ type: "SET_NETWORK_ID", networkID: networkID });
        if (storedConfiguration.startBlockStreamOnConnect) dispatch(startBlockStream());
        async.parallel([
          function (next) { dispatch(ensureLatestBlock(function (err) { next(err); })); },
          function (next) { dispatch(setCoinbase(next)); },
          function (next) { dispatch(setGasPrice(next)); },
        ], initialConnectCallback);
      }));
    });
  };
}

module.exports = connect;
