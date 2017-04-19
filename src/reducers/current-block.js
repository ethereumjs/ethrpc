"use strict";

var clone = require("clone");
var initialState = require("./initial-state").currentBlock;

module.exports = function (currentBlock, action) {
  if (typeof currentBlock === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_CURRENT_BLOCK":
      return clone(action.data);
    case "CLEAR_CURRENT_BLOCK":
      return initialState;
    default:
      return currentBlock;
  }
};
