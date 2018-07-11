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
    setTimeout(function () {
      var streamer = internalState.get("blockAndLogStreamer");
      if (streamer && streamer.reconcileNewBlock) {
        streamer.reconcileNewBlock(newBlock).then(callback).catch(callback);
      }
    }, getState().configuration.propogationDelayWaitMillis);
  };
}

module.exports = onNewBlock;
