"use strict";

var errors = require("../errors/codes");
var store = require("../store");

/**
 * Validate and submit a signed raw transaction to the network.
 * @param {Object} rawTransactionResponse Error response from the Ethereum node.
 * @return {Object|null} Error or null if retrying due to low nonce.
 */
var handleRawTransactionError = function (rawTransactionResponse) {
  if (rawTransactionResponse.message.indexOf("rlp") > -1) {
    return errors.RLP_ENCODING_ERROR;
  } else if (rawTransactionResponse.message.indexOf("Nonce too low") > -1) {
    store.dispatch({ type: "INCREMENT_HIGHEST_NONCE" });
    // ++this.rawTxMaxNonce;
    return null;
  }
  return rawTransactionResponse;
};

module.exports = handleRawTransactionError;
