"use strict";

var abi = require("augur-abi");
var clone = require("clone");
var RPCError = require("./errors/rpc-error");
var errors = require("./errors/codes");
var constants = require("./constants");

/**
 * Package a transaction payload so that it can be sent to the network.
 * @param {Object} payload Static API data.
 * @return {Object} Packaged transaction.
 */
var packageRequest = function (payload) {
  var tx = clone(payload);
  if (tx.params === undefined || tx.params === null) {
    tx.params = [];
  } else if (tx.params.constructor !== Array) {
    tx.params = [tx.params];
  }
  var numParams = tx.params.length;
  if (numParams) {
    if (tx.signature && tx.signature.length !== numParams) {
      throw new RPCError(errors.PARAMETER_NUMBER_ERROR);
    }
    for (var j = 0; j < numParams; ++j) {
      if (tx.params[j] !== undefined && tx.params[j] !== null && tx.signature[j]) {
        if (tx.params[j].constructor === Number) {
          tx.params[j] = abi.prefix_hex(tx.params[j].toString(16));
        }
        if (tx.signature[j] === "int256") {
          tx.params[j] = abi.unfork(tx.params[j], true);
        } else if (tx.signature[j] === "int256[]" &&
          tx.params[j].constructor === Array && tx.params[j].length) {
          for (var k = 0, arrayLen = tx.params[j].length; k < arrayLen; ++k) {
            tx.params[j][k] = abi.unfork(tx.params[j][k], true);
          }
        }
      }
    }
  }
  if (tx.to) tx.to = abi.format_address(tx.to);
  if (tx.from) tx.from = abi.format_address(tx.from);
  var packaged = {
    from: tx.from,
    to: tx.to,
    data: abi.encode(tx),
    gas: tx.gas ? abi.hex(tx.gas) : constants.DEFAULT_GAS
  };
  if (tx.gasPrice) packaged.gasPrice = abi.hex(tx.gasPrice);
  if (tx.timeout) packaged.timeout = abi.hex(tx.timeout);
  if (tx.value) packaged.value = abi.hex(tx.value);
  if (tx.returns) packaged.returns = tx.returns;
  if (tx.nonce) packaged.nonce = tx.nonce;
  return packaged;
};

module.exports = packageRequest;
