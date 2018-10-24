"use strict";

var assign = require("lodash").assign;
var initialState = require("./initial-state").currentBlock;
var validateBlock = require("../validate/validate-block");

module.exports = function (currentBlock, action) {
  if (typeof currentBlock === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_CURRENT_BLOCK":
      var newBlock = assign({}, action.data);
      if (!validateBlock(newBlock)) return currentBlock;
      return newBlock;
    case "CLEAR_CURRENT_BLOCK":
      return initialState;
    default:
      return currentBlock;
  }
};
