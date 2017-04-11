"use strict";

var errors = require("../errors/codes");

/**
 * Validate and submit a signed raw transaction to the network.
 * @param {Object} rawTransactionResponse Error response from the Ethereum node.
 * @return {Object|null} Error or null if retrying due to low nonce.
 */
function handleRawTransactionError(rawTransactionResponse) {
  return function (dispatch) {
    if (rawTransactionResponse.message.indexOf("rlp") > -1) {
      return errors.RLP_ENCODING_ERROR;
    } else if (rawTransactionResponse.message.indexOf("Nonce too low") > -1) {
      dispatch({ type: "INCREMENT_HIGHEST_NONCE" });
      return null;
    }
    return rawTransactionResponse;
  };
}

module.exports = handleRawTransactionError;
