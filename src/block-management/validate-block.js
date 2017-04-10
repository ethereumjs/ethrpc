"use strict";

var ErrorWithData = require("../errors").ErrorWithData;

module.exports = function (block) {
  // validate that the parameter looks like a block
  if (block === null
    || block === undefined
    || block instanceof Error
    || block.error
    || !block.hash
    || !block.parentHash
    || !block.number) throw new ErrorWithData("Expected a block, but found not a block.", block);
};
