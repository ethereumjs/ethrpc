"use strict";

var speedomatic = require("speedomatic");
var clone = require("clone");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");
var constants = require("../constants");

/**
 * Package a transaction payload so that it can be sent to the network.
 * @param {Object} payload Static API data.
 * @return {Object} Packaged transaction.
 */
var packageRequest = function (payload) {
  var tx, numParams, j, k, packaged, arrayLen;
  tx = clone(payload);
  if (tx.params === undefined || tx.params === null) {
    tx.params = [];
  } else if (!Array.isArray(tx.params)) {
    tx.params = [tx.params];
  }
  numParams = tx.params.length;
  if (numParams) {
    if (tx.signature && tx.signature.length !== numParams) {
      throw new RPCError(errors.PARAMETER_NUMBER_ERROR);
    }
    for (j = 0; j < numParams; ++j) {
      if (tx.params[j] !== undefined && tx.params[j] !== null && tx.signature[j]) {
        if (tx.params[j].constructor === Number) {
          tx.params[j] = speedomatic.prefixHex(tx.params[j].toString(16));
        }
        if (tx.signature[j] === "int256") {
          tx.params[j] = speedomatic.unfork(tx.params[j], true);
        } else if (tx.signature[j] === "int256[]" && Array.isArray(tx.params[j]) && tx.params[j].length) {
          for (k = 0, arrayLen = tx.params[j].length; k < arrayLen; ++k) {
            tx.params[j][k] = speedomatic.unfork(tx.params[j][k], true);
          }
        }
      }
    }
  }
  if (tx.to) tx.to = speedomatic.formatEthereumAddress(tx.to);
  if (tx.from) tx.from = speedomatic.formatEthereumAddress(tx.from);
  packaged = {
    from: tx.from,
    to: tx.to,
    data: (tx.data) ? speedomatic.prefixHex(tx.data) : speedomatic.abiEncodeTransactionPayload(tx),
    gas: tx.gas ? speedomatic.hex(tx.gas) : constants.DEFAULT_GAS
  };
  if (tx.gasPrice) packaged.gasPrice = speedomatic.hex(tx.gasPrice);
  if (tx.value) packaged.value = speedomatic.hex(tx.value);
  if (tx.returns) packaged.returns = tx.returns;
  if (tx.nonce) packaged.nonce = tx.nonce;
  return packaged;
};

module.exports = packageRequest;
