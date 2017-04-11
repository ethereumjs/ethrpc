"use strict";

var initialState = null;

module.exports = function (blockAndLogStreamer, action) {
  if (typeof blockAndLogStreamer === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_BLOCK_AND_LOG_STREAMER":
      return action.blockAndLogStreamer;
    case "CLEAR_BLOCK_AND_LOG_STREAMER":
      return initialState;
    default:
      return blockAndLogStreamer;
  }
};
