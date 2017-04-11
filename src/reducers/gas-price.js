"use strict";

var initialState = 20000000000;

module.exports = function (gasPrice, action) {
  if (typeof gasPrice === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_GAS_PRICE":
      return action.gasPrice;
    case "RESET_GAS_PRICE":
      return initialState;
    default:
      return gasPrice;
  }
};
