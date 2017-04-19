"use strict";

var initialState = require("./initial-state").highestNonce;

module.exports = function (highestNonce, action) {
  if (typeof highestNonce === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_HIGHEST_NONCE":
      return action.nonce;
    case "INCREMENT_HIGHEST_NONCE":
      return highestNonce + 1;
    case "DECREMENT_HIGHEST_NONCE":
      return highestNonce - 1;
    case "RESET_HIGHEST_NONCE":
      return initialState;
    default:
      return highestNonce;
  }
};
