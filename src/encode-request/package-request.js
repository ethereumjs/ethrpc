"use strict";

var assign = require("lodash").assign;
var BigNumber = require("bignumber.js");
var speedomatic = require("speedomatic");
var getEstimatedGasWithBuffer = require("./get-estimated-gas-with-buffer");
var processRequestParameters = require("./process-request-parameters");
var DEFAULT_ETH_CALL_GAS = require("../constants").DEFAULT_ETH_CALL_GAS;

/**
 * Package a transaction payload so that it can be sent to the network.
 * @param {Object} payload Modified ABI with parameters.
 * @param {function} callback Callback function.
 * @return {Object} Packaged transaction.
 */
function packageRequest(payload, callback) {
  return function (dispatch, getState) {
    var packaged = {};
    if (payload.to != null) packaged.to = speedomatic.formatEthereumAddress(payload.to);
    if (payload.from != null) packaged.from = speedomatic.formatEthereumAddress(payload.from);
    if (payload.gasPrice != null) packaged.gasPrice = speedomatic.hex(payload.gasPrice);
    if (payload.returns != null) packaged.returns = payload.returns;
    if (payload.nonce != null) packaged.nonce = payload.nonce;
    packaged.value = payload.value != null ? speedomatic.hex(payload.value) : "0x0";
    try {
      packaged.data = payload.data != null ?
        speedomatic.prefixHex(payload.data) :
        speedomatic.abiEncodeTransactionPayload(assign({}, payload, packaged, processRequestParameters(payload.params, payload.signature)));
    } catch (exc) {
      if (getState().debug.tx) console.error("Could not ABI encode request parameters", payload, exc);
      return callback(exc);
    }
    if (payload.gas != null) return callback(null, assign(packaged, { gas: speedomatic.hex(payload.gas) }));
    if (!payload.send) {
      return callback(null, assign(packaged, { gas: (getState().currentBlock || {}).gasLimit || DEFAULT_ETH_CALL_GAS }));
    }
    dispatch(getEstimatedGasWithBuffer(packaged, function (err, estimatedGasWithBuffer) {
      if (err) return callback(err);
      var currentBlock = getState().currentBlock;
      var gas;
      if (currentBlock == null || currentBlock.gasLimit == null) {
        gas = speedomatic.prefixHex(estimatedGasWithBuffer.toString(16));
      } else {
        var currentBlockGasLimit = currentBlock.gasLimit;
        var defaultGas = new BigNumber(DEFAULT_ETH_CALL_GAS, 16);
        gas = new BigNumber(currentBlockGasLimit, 16).lt(estimatedGasWithBuffer) ?
          currentBlockGasLimit :
          speedomatic.prefixHex(estimatedGasWithBuffer.toString(16));
        gas = new BigNumber(gas, 16).lt(defaultGas) ?
          gas :
          DEFAULT_ETH_CALL_GAS;
      }
      if (getState().debug.tx) {
        console.log("Adding", new BigNumber(gas, 16).toFixed(), "of", new BigNumber(currentBlockGasLimit, 16).toFixed(), "gas for", payload.name);
      }
      callback(null, assign(packaged, { gas: gas }));
    }));
  };
}

module.exports = packageRequest;
