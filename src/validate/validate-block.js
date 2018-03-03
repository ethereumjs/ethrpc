"use strict";

var RPCError = require("../errors/rpc-error");

// validate that the parameter looks like a block
function validateBlock(block) {
  if (block === null
    || block === undefined
    || block instanceof Error
    || block.error
    || !block.hash
    || !block.parentHash
    || !block.number) throw new RPCError("INVALID_BLOCK", { data: block });
}

module.exports = validateBlock;
