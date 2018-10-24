"use strict";

var eth_getBlockByNumber = require("../wrappers/eth").getBlockByNumber;
var validateBlock = require("../validate/validate-block");
var RPCError = require("../errors/rpc-error");

/**
 * Ensures that we have the latest block.
 */
function ensureLatestBlock(callback) {
  return function (dispatch) {
    dispatch(eth_getBlockByNumber(["latest", false], function (err, block) {
      if (err) return callback(err);
      if (block === null) return callback(new RPCError("BLOCK_NOT_FOUND"));
      if (!validateBlock(block)) return callback(new RPCError("INVALID_BLOCK", { block: block }));
      dispatch({ type: "SET_CURRENT_BLOCK", data: block });
      callback(null, block);
    }));
  };
}

module.exports = ensureLatestBlock;
