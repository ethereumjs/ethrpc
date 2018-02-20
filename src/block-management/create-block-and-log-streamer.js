"use strict";

var Promise = require("es6-promise").Promise;
var BlockAndLogStreamer = require("ethereumjs-blockstream").BlockAndLogStreamer;
var BlockNotifier = require("../block-management/block-notifier");
var internalState = require("../internal-state");
var isFunction = require("../utils/is-function");
var noop = require("../utils/noop");

function subscribeToBlockNotifier(blockNotifier, blockAndLogStreamer) {
  blockNotifier.subscribe(function (block) {
    blockAndLogStreamer.reconcileNewBlock(block).then(noop).catch(function (err) { console.error(err); });
  });
}

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
function createBlockAndLogStreamer(configuration, transport, cb) {
  return function (dispatch) {
    var callback = isFunction(cb) ? cb : function (err) { if (err) console.error(err); };
    var blockNotifier = new BlockNotifier({
      getLatestBlock: transport.getLatestBlock,
      subscribeToReconnects: transport.subscribeToReconnects,
      unsubscribeFromReconnects: transport.unsubscribeFromReconnects,
      subscribeToDisconnects: transport.subscribeToDisconnects,
      unsubscribeFromDisconnects: transport.unsubscribeFromDisconnects,
      subscribeToNewHeads: transport.subscribeToNewHeads,
      unsubscribeFromNewHeads: transport.unsubscribeFromNewHeads
    }, configuration.pollingIntervalMilliseconds);
    var blockAndLogStreamer = new BlockAndLogStreamer(function (hash) {
      return new Promise(function (resolve, reject) {
        transport.getBlockByHash(hash, function (err, block) {
          if (err) throw err;
          resolve(block);
        });
      });
    }, function (filterOptions) {
      return new Promise(function (resolve, reject) {
        transport.getLogs(filterOptions, function (err, logs) {
          if (err) throw err;
          if (logs == null) throw new Error("Received null/undefined logs and no error.");
          resolve(logs);
        });
      });
    }, { blockRetention: configuration.blockRetention });
    internalState.setState({ blockAndLogStreamer: blockAndLogStreamer, blockNotifier: blockNotifier });
    if (typeof configuration.startingBlockNumber === "undefined") {
      subscribeToBlockNotifier(blockNotifier, blockAndLogStreamer);
      return callback(null);
    }
    transport.getBlockByNumber(configuration.startingBlockNumber, function (err, block) {
      if (err) return callback(err);
      blockAndLogStreamer.reconcileNewBlock(block).then(function () {
        subscribeToBlockNotifier(blockNotifier, blockAndLogStreamer);
        callback(null);
      }).catch(callback);
    });
  };
}

module.exports = createBlockAndLogStreamer;
