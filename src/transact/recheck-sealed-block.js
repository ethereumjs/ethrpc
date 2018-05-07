"use strict";

var eth_getBlockByHash = require("../wrappers/eth").getBlockByHash;

function recheckSealedBlock(onChainTransaction, callback) {
  return function (dispatch) {
    dispatch(eth_getBlockByHash([onChainTransaction.blockHash, false], function (err, block) {
      if (err) return callback(err);
      if (block == null) {
        console.warn("No block found for block hash", onChainTransaction.blockHash);
        dispatch({ type: "TRANSACTION_PENDING", hash: onChainTransaction.hash });
        return callback(null);
      }
      var updatedOnChainTransactionData = { timestamp: parseInt(block.timestamp, 16), callReturn: onChainTransaction.callReturn };
      dispatch({ type: "UPDATE_ON_CHAIN_TRANSACTION", hash: onChainTransaction.hash, data: updatedOnChainTransactionData });
      callback(null, true);
    }));
  };
}

module.exports = recheckSealedBlock;
