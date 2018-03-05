"use strict";

var sha3 = require("../utils/sha3");
var RPCError = require("../errors/rpc-error");

function wrapOnFailedCallback(payload, onFailedCallback) {
  return function (response) {
    // notify subscribers of failed transaction
    // if (debug.tx)
      console.error("transaction failed:", response, payload, response && response.hash, sha3(JSON.stringify(payload)));
    var failedTransactionHash = (response && response.hash) || sha3(JSON.stringify(payload));
    // dispatch({ type: "TRANSACTION_FAILED", hash: failedTransactionHash });
    if (response instanceof Error) return onFailedCallback(response);
    onFailedCallback(new RPCError("TRANSACTION_FAILED", ))
  };
}
