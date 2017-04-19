"use strict";

var validateNumber = require("./validate-number");

var validateAndDefaultBlockNumber = function (blockNumber) {
  if (blockNumber === undefined) return "latest";
  if (blockNumber === null) return "latest";
  if (blockNumber === "latest") return blockNumber;
  if (blockNumber === "earliest") return blockNumber;
  if (blockNumber === "pending") return blockNumber;
  try {
    return validateNumber(blockNumber, "block");
  } catch (error) {
    throw new Error("block must be a number, a 0x prefixed hex string, or 'latest' or 'earliest' or 'pending'");
  }
};

module.exports = validateAndDefaultBlockNumber;
