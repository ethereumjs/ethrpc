"use strict";

var speedomatic = require("speedomatic");
var packageRequest = require("../encode-request/package-request");
var constants = require("../constants");

/**
 * Package a raw transaction.
 * @param {Object} payload Static API data with "params" and "from" set.
 * @param {string} address The sender's Ethereum address.
 * @return {Object} Packaged transaction.
 */
function packageRawTransaction(payload, address, networkID, currentBlock) {
  var packaged = packageRequest(payload);
  packaged.from = address;
  packaged.nonce = payload.nonce || 0;
  packaged.value = payload.value || "0x0";
  if (payload.gasLimit) {
    packaged.gasLimit = speedomatic.hex(payload.gasLimit);
  } else if (currentBlock && currentBlock.gasLimit) {
    packaged.gasLimit = speedomatic.hex(currentBlock.gasLimit);
  } else {
    packaged.gasLimit = constants.DEFAULT_GAS;
  }
  if (networkID && speedomatic.encodeNumberAsJSNumber(networkID) > 0 && speedomatic.encodeNumberAsJSNumber(networkID) < 109) {
    packaged.chainId = speedomatic.encodeNumberAsJSNumber(networkID);
  }
  if (payload.gasPrice && speedomatic.encodeNumberAsJSNumber(payload.gasPrice) > 0) {
    packaged.gasPrice = speedomatic.hex(payload.gasPrice);
  }
  return packaged;
}

module.exports = packageRawTransaction;
