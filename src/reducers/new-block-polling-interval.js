"use strict";

var initialState = require("./initial-state").newBlockPollingInterval;

module.exports = function (newBlockPollingInterval, action) {
  if (typeof newBlockPollingInterval === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_NEW_BLOCK_POLLING_INTERVAL":
      return action.newBlockPollingInterval;
    case "CLEAR_NEW_BLOCK_POLLING_INTERVAL":
      return initialState;
    default:
      return newBlockPollingInterval;
  }
};
