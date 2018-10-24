"use strict";

// validate that the parameter looks like a block
function validateBlock(block) {
  return (
    block !== null &&
    typeof block !== "undefined" &&
    !(block instanceof Error) &&
    !block.error &&
    block.hash &&
    block.parentHash &&
    block.number
  );
}

module.exports = validateBlock;
