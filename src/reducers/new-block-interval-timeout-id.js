"use strict";

var initialState = null;

module.exports = function (newBlockIntervalTimeoutId, action) {
  if (typeof newBlockIntervalTimeoutId === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_NEW_BLOCK_INTERVAL_TIMEOUT_ID":
      return action.id;
    case "CLEAR_NEW_BLOCK_INTERVAL_TIMEOUT_ID":
      if (newBlockIntervalTimeoutId) clearInterval(newBlockIntervalTimeoutId);
      return initialState;
    default:
      return newBlockIntervalTimeoutId;
  }
};
