"use strict";

var initialState = null;

module.exports = function (blockNotifier, action) {
  if (typeof blockNotifier === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_BLOCK_NOTIFIER":
      return action.blockNotifier;
    case "ADD_BLOCK_NOTIFIER_SUBSCRIPTION":
      blockNotifier.subscribe(action.subscription); // FIXME mutates blockNotifier
      return blockNotifier;
    default:
      return blockNotifier;
  }
};
