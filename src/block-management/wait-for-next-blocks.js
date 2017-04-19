"use strict";

var eth_blockNumber = require("../wrappers/eth").blockNumber;
var miner = require("../wrappers/miner");
var isFunction = require("../utils/is-function");
var constants = require("../constants");

/**
 * Wait for the specified number of blocks to appear before calling `callback`
 */
module.exports = function (blocks, mine, callback) {
  return function (dispatch) {
    var startBlock, endBlock;
    function waitForNextBlocks() {
      dispatch(eth_blockNumber(null, function (blockNumber) {
        blockNumber = parseInt(blockNumber, 16);
        if (startBlock === undefined) {
          startBlock = blockNumber;
          endBlock = blockNumber + parseInt(blocks, 10);
        }
        if (blockNumber >= endBlock) {
          if (!mine) return callback(endBlock);
          dispatch(miner.stop(null, function () { callback(endBlock); }));
        } else {
          setTimeout(waitForNextBlocks, constants.BLOCK_POLL_INTERVAL);
        }
      }));
    }
    if (!callback && isFunction(mine)) {
      callback = mine;
      mine = null;
    }
    if (!mine) return waitForNextBlocks();
    dispatch(miner.start(null, waitForNextBlocks));
  };
};
