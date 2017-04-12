"use strict";

var ErrorWithData = require("../errors").ErrorWithData;

// validate that the parameter looks like a block
function validateBlock(block) {
  if (block === null
    || block === undefined
    || block instanceof Error
    || block.error
    || !block.hash
    || !block.parentHash
    || !block.number) throw new ErrorWithData("Expected a block, but found not a block.", block);
}

module.exports = validateBlock;
