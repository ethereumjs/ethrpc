"use strict";

var BlockAndLogStreamer = require("ethereumjs-blockstream").BlockAndLogStreamer;
var BlockNotifier = require("../block-management/block-notifier");

/**
 * Used internally.  Instantiates a new BlockAndLogStreamer backed by ethrpc and BlockNotifier.
 *
 * @typedef Block
 * @type object
 * @property hash
 * @property parentHash
 *
 * @typedef FilterOptions
 * @type object
 * @property {(string|undefined)} address
 * @property {(string|string[]|null)[]} topics
 * @property {(string|undefined)} fromBlock
 * @property {(string|undefined)} toBlock
 * @property {(string|undefined)} limit
 *
 * @typedef Configuration
 * @type object
 * @property {number} pollingIntervalMilliseconds
 * @property {number} blockRetention
 *
 * @typedef Transport
 * @type object
 * @property {function(function(Error, Block):void):void} getLatestBlock
 * @property {function(string, function(Error, Block):void):void} getBlockByHash
 * @property {function(FilterOptions, function(Error, Log[]):void):void} getLogs
 * @property {function(function():void, function(Error):void):string} subscribeToReconnects
 * @property {function(string):void} unsubscribeFromReconnects
 * @property {function(function(Block):void, function(Error):void):string} subscribeToNewHeads
 * @property {function(string):void} unsubscribeFromNewHeads
 *
 * @param {Configuration} configuration
 * @param {Transport} transport
 */
function createBlockAndLogStreamer(configuration, transport) {
  return function (dispatch) {
    var reconcileWithErrorLogging, blockNotifier, blockAndLogStreamer;
    blockNotifier = new BlockNotifier(transport, configuration.pollingIntervalMilliseconds);
    dispatch({ type: "SET_BLOCK_NOTIFIER", blockNotifier: blockNotifier });
    blockAndLogStreamer = BlockAndLogStreamer.createCallbackStyle(transport.getBlockByHash, transport.getLogs, {
      blockRetention: configuration.blockRetention
    });
    dispatch({ type: "SET_BLOCK_AND_LOG_STREAMER", blockAndLogStreamer: blockAndLogStreamer });
    reconcileWithErrorLogging = function (block) {
      blockAndLogStreamer.reconcileNewBlockCallbackStyle(block, function (error) {
        if (error) console.error(error);
      });
    };
    dispatch({ type: "ADD_BLOCK_NOTIFIER_SUBSCRIPTION", subscription: reconcileWithErrorLogging });
    // blockNotifier.subscribe(reconcileWithErrorLogging);
  };
}

module.exports = createBlockAndLogStreamer;
