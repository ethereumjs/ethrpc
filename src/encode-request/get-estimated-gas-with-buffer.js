"use strict";

var eth_estimateGas = require("../wrappers/eth").estimateGas;
var calculateEstimatedGasWithBuffer = require("./calculate-estimated-gas-with-buffer");

function getEstimatedGasWithBuffer(packaged, callback) {
  return function (dispatch) {
    dispatch(eth_estimateGas(packaged, function (err, estimatedGas) {
      if (err) return callback(err);
      callback(null, calculateEstimatedGasWithBuffer(estimatedGas));
    }));
  };
}

module.exports = getEstimatedGasWithBuffer;
