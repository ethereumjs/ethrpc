"use strict";

var abi = require("augur-abi");

/**
 * Compare nonce to the maximum nonce seen so far.
 * @param {number} nonce Raw transaction nonce as a base 10 integer.
 * @return {string} Adjusted (if needed) nonce as a hex string.
 */
var verifyRawTransactionNonce = function (nonce) {
  if (nonce <= this.rawTxMaxNonce) {
    nonce = ++this.rawTxMaxNonce;
  } else {
    this.rawTxMaxNonce = nonce;
  }
  // if (this.debug.nonce) console.log("[ethrpc] nonce:", nonce, this.rawTxMaxNonce);
  return abi.hex(nonce);
};

module.exports = verifyRawTransactionNonce;
