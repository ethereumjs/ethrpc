"use strict";

var async = require("async");
var net_version = require("./wrappers/net").version;
var setGasPrice = require("./wrappers/set-gas-price");
var setCoinbase = require("./wrappers/set-coinbase");
var Transporter = require("./transport/transporter");
var ensureLatestBlock = require("./block-management/ensure-latest-block");
var startBlockStream = require("./start-block-stream");
var createTransportAdapter = require("./block-management/ethrpc-transport-adapter");
var onNewBlock = require("./block-management/on-new-block");
var validateConfiguration = require("./validate/validate-configuration");
var resetState = require("./reset-state");
var ErrorWithData = require("./errors").ErrorWithData;
var isFunction = require("./utils/is-function");
var logError = require("./utils/log-error");
var internalState = require("./internal-state");

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
    var syncOnly, storedConfiguration, debug = getState().debug;
    dispatch(resetState());

    // Use logError (console.error) as default out-of-band error handler if not set
    if (!isFunction(configuration.errorHandler)) {
      configuration.errorHandler = logError;
    }
    internalState.set("outOfBandErrorHandler", configuration.errorHandler);
    dispatch({ type: "SET_CONFIGURATION", configuration: validateConfiguration(configuration) });

    syncOnly = !initialConnectCallback;
    if (syncOnly) {
      initialConnectCallback = function (error) {
        if (error instanceof Error) throw error;
        else if (error) throw new ErrorWithData(error);
      };
    }

    // initialize the transporter, this will be how we send to and receive from the blockchain
    storedConfiguration = getState().configuration;
    new Transporter(storedConfiguration, internalState.get("shimMessageHandler"), syncOnly, debug.connect, function (err, transporter) {
      if (err !== null) return initialConnectCallback(err);
      internalState.set("transporter", transporter);

      // ensure we can do basic JSON-RPC over this connection
      dispatch(net_version(null, function (networkID) {
        if (networkID instanceof Error || networkID.error) return initialConnectCallback(networkID);

        // If configuration.networkID is provided, verify that we're actually on that network
        if (configuration.networkID && parseInt(networkID, 10) !== parseInt(configuration.networkID, 10)) {
          return initialConnectCallback(networkID);
        }

        dispatch({ type: "SET_NETWORK_ID", networkID: networkID });
        if (storedConfiguration.startBlockStreamOnConnect) dispatch(startBlockStream());
        async.parallel([
          function (next) { dispatch(ensureLatestBlock(function () { next(); })); },
          function (next) { dispatch(setCoinbase(next)); },
          function (next) { dispatch(setGasPrice(next)); }
        ], initialConnectCallback);
      }));
    });
  };
}

module.exports = connect;
