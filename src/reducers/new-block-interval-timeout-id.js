"use strict";

var initialState = null;

module.exports = function (newBlockIntervalTimeoutID, action) {
  if (typeof newBlockIntervalTimeoutID === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_NEW_BLOCK_INTERVAL_TIMEOUT_ID":
      return action.id;
    case "CLEAR_NEW_BLOCK_INTERVAL_TIMEOUT_ID":
      if (newBlockIntervalTimeoutID) clearInterval(newBlockIntervalTimeoutID); // mutation >:o
      return initialState;
    default:
      return newBlockIntervalTimeoutID;
  }
};
