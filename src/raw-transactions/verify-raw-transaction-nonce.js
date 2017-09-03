"use strict";

var speedomatic = require("speedomatic");

/**
 * Compare nonce to the maximum nonce seen so far.
 * @param {number} nonce Raw transaction nonce as a base 10 integer.
 * @return {string} Adjusted (if needed) nonce as a hex string.
 */
function verifyRawTransactionNonce(nonce) {
  return function (dispatch, getState) {
    var highestNonce = getState().highestNonce;
    if (nonce <= highestNonce) {
      nonce = highestNonce + 1;
      dispatch({ type: "INCREMENT_HIGHEST_NONCE" });
    } else {
      dispatch({ type: "SET_HIGHEST_NONCE", nonce: nonce });
    }
    return speedomatic.hex(nonce);
  };
}

module.exports = verifyRawTransactionNonce;
