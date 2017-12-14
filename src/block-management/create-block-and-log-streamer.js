"use strict";

var BlockAndLogStreamer = require("ethereumjs-blockstream").BlockAndLogStreamer;
var BlockNotifier = require("../block-management/block-notifier");
var internalState = require("../internal-state");
var eth_getBlockByNumber = require("../wrappers/eth").getBlockByNumber;

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
 * @property {function(function():void, function(Error):void):string} subscribeToDisconnects
 * @property {function(string):void} unsubscribeFromDisconnects
 * @property {function(function(Block):void, function(Error):void):string} subscribeToNewHeads
 * @property {function(string):void} unsubscribeFromNewHeads
 *
 * @param {Configuration} configuration
 * @param {Transport} transport
 */
function createBlockAndLogStreamer(configuration, transport) {
  return function (dispatch, getState) {
    var blockNotifier = new BlockNotifier({
      getLatestBlock: transport.getLatestBlock,
      subscribeToReconnects: transport.subscribeToReconnects,
      unsubscribeFromReconnects: transport.unsubscribeFromReconnects,
      subscribeToDisconnects: transport.subscribeToDisconnects,
      unsubscribeFromDisconnects: transport.unsubscribeFromDisconnects,
      subscribeToNewHeads: transport.subscribeToNewHeads,
      unsubscribeFromNewHeads: transport.unsubscribeFromNewHeads
    }, configuration.pollingIntervalMilliseconds);
    var blockAndLogStreamer = BlockAndLogStreamer.createCallbackStyle(transport.getBlockByHash, transport.getLogs, {
      blockRetention: configuration.blockRetention
    });

    internalState.setState({ blockAndLogStreamer: blockAndLogStreamer, blockNotifier: blockNotifier });
    function subscribeToBlockNotifier() {
      blockNotifier.subscribe(function (block) {
        blockAndLogStreamer.reconcileNewBlockCallbackStyle(block, function (err) { if (err) return console.error(err); });
      });
    }

    if (typeof configuration.startingBlockNumber !== "undefined") {
      var block = dispatch(eth_getBlockByNumber([configuration.startingBlockNumber, false]));
      blockAndLogStreamer.reconcileNewBlockCallbackStyle(block, function (err) {
        if (err) return console.error(err);
        subscribeToBlockNotifier();
      });
    } else {
      subscribeToBlockNotifier();
    }
  };
}

module.exports = createBlockAndLogStreamer;
