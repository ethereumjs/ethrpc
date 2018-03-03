"use strict";

var RPCError = require("../errors/rpc-error");

/**
 * Validate and submit a signed raw transaction to the network.
 * @param {Object} rawTransactionResponse Error response from the Ethereum node.
 * @return {Object|null} Error or null if retrying due to low nonce.
 */
function handleRawTransactionError(rawTransactionResponse) {
  // TODO figure out a better way to do this than comparing strings
  if (rawTransactionResponse.message.indexOf("Nonce too low") > -1) return null;
  if (rawTransactionResponse.message.indexOf("replacement transaction underpriced") > -1) return null;
  return new RPCError(rawTransactionResponse);
}

module.exports = handleRawTransactionError;
