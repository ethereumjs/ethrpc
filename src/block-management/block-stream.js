"use strict";

var BlockNotifier = require("./block-notifier.js");
var Notifier = require("./notifier.js");
var validateBlock = require("./validate-block.js");

/**
 * This object will emit a stream of new blocks, after handling backfills and reorgs.
 * 
 * @typedef transport
 * @type object
 * @property {function(string, boolean, function(object):void):void} getBlockByHash
 * 
 * @param {Transport} transport
 * @param {Notifier} blockNotifier - A Notifier that will fire on new block candidates.
 */
function BlockStream(transport, pollingIntervalMilliseconds) {
  Notifier.call(this);

  var blocks = {};
  var headBlock = null;
  var sidelinedBlocks = {};
  var blockRetentionLimit = 100;
  var blockNotifier = new BlockNotifier(transport, pollingIntervalMilliseconds);

  this.destroy = function () {
    this.unsubscribeAll();
    blockNotifier.destroy();
  }.bind(this);

  var shouldKeepBlock = function(block) {
    if (!block) return false;
    var blockNumber = parseInt(block.number);
    if (isNaN(blockNumber)) return false;
    var blockAge = parseInt(headBlock.number) - blockNumber;
    return (blockAge < blockRetentionLimit);
  }.bind(this);

  var getSidelinedChildBlock = function (parentHash) {
    for (var sidelinedBlockHash in sidelinedBlocks) {
      if (!sidelinedBlocks.hasOwnProperty(sidelinedBlockHash)) continue;
      var sidelinedBlock = sidelinedBlocks[sidelinedBlockHash];
      if (sidelinedBlock.parentHash !== parentHash) continue;
      return sidelinedBlock;
    }
    return null;
  }.bind(this);

  var pruneOldBlocks = function () {
    if (!headBlock) return;
    for (var blockHash in blocks) {
      if (!blocks.hasOwnProperty(blockHash)) continue;
      if (!shouldKeepBlock(blocks[blockHash])) delete blocks[blockHash];
    }
    for (var sidelinedBlockHash in sidelinedBlocks) {
      if (!sidelinedBlocks.hasOwnProperty(sidelinedBlockHash)) continue;
      if (!shouldKeepBlock(sidelinedBlocks[sidelinedBlockHash])) delete sidelinedBlocks[sidelinedBlockHash];
    }
  }.bind(this);

  var processSidelinedChild = function (parentBlock) {
    var childBlock = getSidelinedChildBlock(parentBlock.hash);
    if (!childBlock) return;
    processMaybeNewBlock(childBlock);
  }.bind(this);

  var setNewHeadBlock = function (newHeadBlock) {
    delete sidelinedBlocks[newHeadBlock.hash];
    headBlock = newHeadBlock;
    blocks[newHeadBlock.hash] = newHeadBlock;
    this.notifySubscribers(newHeadBlock, null);
    processSidelinedChild(newHeadBlock);
    pruneOldBlocks();
  }.bind(this);

  var removeBlockByHash = function (blockHash) {
    if (headBlock.hash === blockHash) {
      headBlock = (blocks[headBlock.parentHash] || null);
    }
    delete blocks[blockHash];
    delete sidelinedBlocks[blockHash];
  }.bind(this);

  var rollback = function (blocksToRemove) {
    blocksToRemove.forEach(function (blockToRemove) {
      removeBlockByHash(blockToRemove.hash);
      this.notifySubscribers(null, blockToRemove);
    }.bind(this));
  }.bind(this);

  var rollbackEntireChain = function () {
    var blocksToRemove = [];
    for (var maybeParent = headBlock; maybeParent; maybeParent = blocks[maybeParent.parentHash]) {
      blocksToRemove.push(maybeParent);
    }
    rollback(blocksToRemove);
  }.bind(this);

  var backfill = function (maybeNewBlock) {
    sidelinedBlocks[maybeNewBlock.hash] = maybeNewBlock;
    // a reorg that forks past the oldest block we have (e.g., just after startup) can cause us to try to backfill indefinitely in an attempt to find the branch point.  if we have been attempting to backfill for long enough, just give up, rollback our current chain, then wipe everything out and start fresh
    var sidelinedBlocksIsFull = Object.keys(sidelinedBlocks).length > blockRetentionLimit;
    var thisBlockIsMuchOlderThanHead = parseInt(headBlock.number) > (parseInt(maybeNewBlock.number) + blockRetentionLimit);
    if (sidelinedBlocksIsFull && thisBlockIsMuchOlderThanHead) {
      rollbackEntireChain();
      blocks = {};
      headBlock = null;
      sidelinedBlocks = {};
      transport.getBlockByNumber("latest", false, function (newHead) {
        processMaybeNewBlock(newHead);
      }.bind(this));
      return;
    }
    transport.getBlockByHash(maybeNewBlock.parentHash, false, function (parentBlockOrError) {
      // a re-orgs during backfilling could lead to the block we are fetching being orphaned and we get an error back.  in this case, just give up on this chain as we likely are already on the new chain, or we are in the process of re-syncing
      if (!parentBlockOrError || parentBlockOrError instanceof Error || parentBlockOrError.error) return;
      processMaybeNewBlock(parentBlockOrError);
    });
  }.bind(this);

  var tryRollback = function (maybeNewBlock) {
    var blocksToRemove = [];
    for (var maybeParent = headBlock; maybeParent; maybeParent = blocks[maybeParent.parentHash]) {
      if (maybeParent.hash === maybeNewBlock.parentHash) {
        rollback(blocksToRemove, maybeNewBlock);
        return true;
      } else {
        blocksToRemove.push(maybeParent);
      }
    }
    return false;
  }.bind(this);

  var isSidelined = function (block) {
    return (sidelinedBlocks[block.hash]);
  }.bind(this);

  var isChildOfHeadBlock = function (block) {
    return headBlock.hash === block.parentHash;
  }.bind(this);

  var isCurrentHeadBlock = function (block) {
    return headBlock.hash === block.hash;
  }.bind(this);

  var isFirstBlock = function () {
    return headBlock === null;
  }.bind(this);

  /* jshint -W003 */
  var processMaybeNewBlock = function(maybeNewBlock) {
    validateBlock(maybeNewBlock);

    if (isFirstBlock(maybeNewBlock)) return setNewHeadBlock(maybeNewBlock);
    if (isCurrentHeadBlock(maybeNewBlock)) return;
    if (isChildOfHeadBlock(maybeNewBlock)) return setNewHeadBlock(maybeNewBlock);
    if (isSidelined(maybeNewBlock)) return;
    if (tryRollback(maybeNewBlock)) return setNewHeadBlock(maybeNewBlock);
    backfill(maybeNewBlock);
  }.bind(this);
  /* jshint +W003 */

  blockNotifier.subscribe(processMaybeNewBlock);
}

BlockStream.prototype = Object.create(Notifier.prototype);
BlockStream.prototype.constructor = BlockStream;

module.exports = BlockStream;
