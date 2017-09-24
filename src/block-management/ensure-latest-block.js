"use strict";

var onNewBlock = require("../block-management/on-new-block");
var eth_getBlockByNumber = require("../wrappers/eth").getBlockByNumber;
var isFunction = require("../utils/is-function");

/**
 * Ensures that we have the latest block.
 */
function ensureLatestBlock(callback) {
  return function (dispatch) {
    var block;
    if (!isFunction(callback)) {
      block = dispatch(eth_getBlockByNumber(["latest", false]));
      if (block && !block.error && !(block instanceof Error)) {
        dispatch(onNewBlock(block));
        return block;
      }
    } else {
      dispatch(eth_getBlockByNumber(["latest", false], function (block) {
        if (block && !block.error) {
          dispatch(onNewBlock(block));
          callback(block);
        }
      }));
    }
  };
}

module.exports = ensureLatestBlock;
