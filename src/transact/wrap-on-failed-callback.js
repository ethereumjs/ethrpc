"use strict";

var assign = require("lodash").assign;
var sha3 = require("../utils/sha3");
var RPCError = require("../errors/rpc-error");

function wrapOnFailedCallback(payload, onFailedCallback, dispatch) {
  return function (response) {
    // notify subscribers of failed transaction
    var failedTransactionHash = response.hash || sha3(JSON.stringify(payload));
    console.error("transaction failed:", response, payload, response.hash, failedTransactionHash);
    dispatch({ type: "TRANSACTION_FAILED", hash: failedTransactionHash });
    if (response instanceof Error) return onFailedCallback(assign(response, { hash: failedTransactionHash }));
    onFailedCallback(new RPCError("TRANSACTION_FAILED", assign(response, { hash: failedTransactionHash })));
  };
}

module.exports = wrapOnFailedCallback;
