"use strict";

var initialState = require("./initial-state").networkID;

module.exports = function (networkID, action) {
  if (typeof networkID === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_NETWORK_ID":
      return action.networkID;
    case "CLEAR_NETWORK_ID":
      return initialState;
    default:
      return networkID;
  }
};
