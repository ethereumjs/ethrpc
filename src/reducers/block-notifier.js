"use strict";

var isFunction = require("../utils/is-function");

var initialState = null;

module.exports = function (blockNotifier, action) {
  if (typeof blockNotifier === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_BLOCK_NOTIFIER":
      return action.blockNotifier;
    case "ADD_BLOCK_NOTIFIER_SUBSCRIPTION":
      blockNotifier.subscribe(action.reconcileWithErrorLogging); // FIXME mutates blockNotifier
      return blockNotifier;
    case "CLEAR_BLOCK_NOTIFIER":
      if (blockNotifier && isFunction(blockNotifier.destroy)) blockNotifier.destroy();
      return initialState;
    default:
      return blockNotifier;
  }
};
