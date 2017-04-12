"use strict";

var eth = require("../wrappers/eth");
var miner = require("../wrappers/miner");
var isFunction = require("../utils/is-function");
var constants = require("../constants");

/**
 * Wait for the specified number of blocks to appear before calling `callback`
 */
function waitForNextBlocks(blocks, mine, callback) {
  return function (dispatch) {
    var startBlock, endBlock;
    function fastforward() {
      dispatch(eth.blockNumber(null, function (blockNumber) {
        blockNumber = parseInt(blockNumber, 16);
        if (startBlock === undefined) {
          startBlock = blockNumber;
          endBlock = blockNumber + parseInt(blocks, 10);
        }
        if (blockNumber >= endBlock) {
          if (!mine) return callback(endBlock);
          dispatch(miner.stop(null, function () {
            callback(endBlock);
          }));
        } else {
          setTimeout(fastforward, constants.BLOCK_POLL_INTERVAL);
        }
      }));
    }
    if (!callback && isFunction(mine)) {
      callback = mine;
      mine = null;
    }
    if (!mine) return fastforward();
    dispatch(miner.start(null, fastforward));
  };
}

module.exports = waitForNextBlocks;
