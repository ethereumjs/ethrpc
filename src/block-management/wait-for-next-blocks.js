"use strict";

var eth_blockNumber = require("../wrappers/eth").blockNumber;
var miner = require("../wrappers/miner");
var isFunction = require("../utils/is-function");
var constants = require("../constants");
var errors = require("../errors/codes");
var RPCError = require("../errors/rpc-error");

/**
 * Wait for the specified number of blocks to appear before calling `callback`
 */
module.exports = function (blocks, mine, callback) {
  return function (dispatch) {
    var startBlock, endBlock;
    function waitForNextBlocks(err) {
      if (err) return callback(err);
      dispatch(eth_blockNumber(null, function (err, blockNumber) {
        if (err) return callback(err);
        if (blockNumber == null) return callback(new RPCError(errors.NO_RESPONSE));
        blockNumber = parseInt(blockNumber, 16);
        if (startBlock === undefined) {
          startBlock = blockNumber;
          endBlock = blockNumber + parseInt(blocks, 10);
        }
        if (blockNumber >= endBlock) {
          if (!mine) return callback(null, endBlock);
          dispatch(miner.stop(null, function () { callback(null, endBlock); }));
        } else {
          setTimeout(waitForNextBlocks, constants.BLOCK_POLL_INTERVAL);
        }
      }));
    }
    if (!callback && isFunction(mine)) {
      callback = mine;
      mine = null;
    }
    if (!mine) return waitForNextBlocks(null);
    dispatch(miner.start(null, waitForNextBlocks));
  };
};
