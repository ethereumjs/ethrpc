"use strict";

var createBlockAndLogStreamer = require("./block-management/create-block-and-log-streamer");
var createTransportAdapter = require("./block-management/ethrpc-transport-adapter");
var onNewBlock = require("./block-management/on-new-block");
var internalState = require("./internal-state");

module.exports = function(startingBlockNumber) {
  return function(dispatch, getState) {
    var storedConfiguration = getState().configuration;
    dispatch(createBlockAndLogStreamer({
      pollingIntervalMilliseconds: storedConfiguration.pollingIntervalMilliseconds,
      blockRetention: storedConfiguration.blockRetention,
      startingBlockNumber: startingBlockNumber
    }, dispatch(createTransportAdapter(internalState.get("transporter"))), internalState.get("outOfBandErrorHandler")));
    internalState.get("blockAndLogStreamer").subscribeToOnBlockAdded(function (block) {
      dispatch(onNewBlock(block));
    });
  }
}
