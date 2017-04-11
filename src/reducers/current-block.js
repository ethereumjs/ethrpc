"use strict";

var clone = require("clone");

var initialState = null;

module.exports = function (currentBlock, action) {
  if (typeof currentBlock === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_CURRENT_BLOCK":
      return clone(action.block);
    case "REMOVE_CURRENT_BLOCK":
      return initialState;
    default:
      return currentBlock;
  }
};
