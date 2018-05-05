"use strict";

var internalState = require("../internal-state");
var reprocessTransactions = require("../transact/reprocess-transactions");
var logError = require("../utils/log-error");

function onNewBlock(newBlock, cb) {
  return function (dispatch, getState) {
    var callback = cb || logError;
    if (newBlock === null) return callback(null);
    if (getState().debug.broadcast) console.log("[ethrpc] New block:", newBlock.hash);
    dispatch(reprocessTransactions());
    internalState.get("blockAndLogStreamer").reconcileNewBlock(newBlock).then(callback).catch(callback);
  };
}

module.exports = onNewBlock;
