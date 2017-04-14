"use strict";

var net_version = require("./wrappers/net").version;
var Transporter = require("./transport/transporter");
var createTransportAdapter = require("./block-management/ethrpc-transport-adapter");
var createBlockAndLogStreamer = require("./block-management/create-block-and-log-streamer");
var onNewBlock = require("./block-management/on-new-block");
var resetState = require("./reset-state");
var ErrorWithData = require("./errors").ErrorWithData;

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
    var syncOnly, state, debug, storedConfiguration, shimMessageHandler;
    dispatch(resetState());
    dispatch({ type: "SET_CONFIGURATION", configuration: configuration });

    state = getState();
    debug = state.debug;
    storedConfiguration = state.configuration;
    shimMessageHandler = state.shimMessageHandler;

    syncOnly = !initialConnectCallback;
    if (syncOnly) {
      initialConnectCallback = function (error) {
        if (error instanceof Error) {
          throw error;
        } else if (error) {
          throw new ErrorWithData(error);
        }
      };
    }

    // initialize the transporter, this will be how we send to and receive from the blockchain
    new Transporter(storedConfiguration, shimMessageHandler, syncOnly, debug.connect, function (error, transporter) {
      if (error !== null) return initialConnectCallback(error);
      dispatch({ type: "SET_TRANSPORTER", transporter: transporter });

      // ensure we can do basic JSON-RPC over this connection
      dispatch(net_version(null, function (errorOrResult) {
        if (errorOrResult instanceof Error || errorOrResult.error) {
          return initialConnectCallback(errorOrResult);
        }
        dispatch(createBlockAndLogStreamer({
          pollingIntervalMilliseconds: storedConfiguration.pollingIntervalMilliseconds,
          blockRetention: storedConfiguration.blockRetention
        }, dispatch(createTransportAdapter())));
        getState().blockAndLogStreamer.subscribeToOnBlockAdded(function (block) { dispatch(onNewBlock(block)); });
        initialConnectCallback(null);
      }));
    });
  };
}

module.exports = connect;
