"use strict";

var abi = require("augur-abi");
var packageRequest = require("../encode-request/package-request");
var constants = require("../constants");

/**
 * Package a raw transaction.
 * @param {Object} payload Static API data with "params" and "from" set.
 * @param {string} address The sender's Ethereum address.
 * @return {Object} Packaged transaction.
 */
var packageRawTransaction = function (payload, address) {
  var packaged = packageRequest(payload);
  packaged.from = address;
  packaged.nonce = payload.nonce || 0;
  packaged.value = payload.value || "0x0";
  if (payload.gasLimit) {
    packaged.gasLimit = abi.hex(payload.gasLimit);
  } else if (this.block && this.block.gasLimit) {
    packaged.gasLimit = abi.hex(this.block.gasLimit);
  } else {
    packaged.gasLimit = constants.DEFAULT_GAS;
  }
  if (this.networkID && parseInt(this.networkID, 10) < 109) {
    packaged.chainId = parseInt(this.networkID, 10);
  }
  // if (this.debug.broadcast) console.log("[ethrpc] payload:", payload);
  if (payload.gasPrice && abi.number(payload.gasPrice) > 0) {
    packaged.gasPrice = abi.hex(payload.gasPrice);
  }
  return packaged;
};

module.exports = packageRawTransaction;
