"use strict";

var storeObservers = require("./");

function selectCurrentBlock(state) {
  return state.currentBlock;
}

module.exports = function (id, onStateChange) {
  return function (dispatch) {
    dispatch(storeObservers.add(id, "SET_CURRENT_BLOCK", selectCurrentBlock, onStateChange));
  };
};
