"use strict";

var BigNumber = require("bignumber.js");
var GAS_ESTIMATE_MULTIPLIER = require("../constants").GAS_ESTIMATE_MULTIPLIER;

function calculateEstimatedGasWithBuffer(estimatedGas) {
  return new BigNumber(estimatedGas, 16).times(GAS_ESTIMATE_MULTIPLIER).integerValue(BigNumber.ROUND_FLOOR);
}

module.exports = calculateEstimatedGasWithBuffer;
