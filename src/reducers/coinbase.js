"use strict";

var initialState = require("./initial-state").coinbase;

module.exports = function (coinbase, action) {
  if (typeof coinbase === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_COINBASE":
      return action.address;
    case "CLEAR_COINBASE":
      return initialState;
    default:
      return coinbase;
  }
};
