"use strict";

var abi = require("augur-abi");
var store = require("../store");

/**
 * Compare nonce to the maximum nonce seen so far.
 * @param {number} nonce Raw transaction nonce as a base 10 integer.
 * @return {string} Adjusted (if needed) nonce as a hex string.
 */
var verifyRawTransactionNonce = function (nonce) {
  var highestNonce = store.getState().highestNonce;
  if (nonce <= highestNonce) {
    nonce = highestNonce + 1;
    store.dispatch({ type: "INCREMENT_HIGHEST_NONCE" });
    // nonce = ++this.rawTxMaxNonce;
  } else {
    store.dispatch({ type: "SET_HIGHEST_NONCE", nonce: nonce });
    // this.rawTxMaxNonce = nonce;
  }
  // if (this.debug.nonce) console.log("[ethrpc] nonce:", nonce, this.rawTxMaxNonce);
  return abi.hex(nonce);
};

module.exports = verifyRawTransactionNonce;
