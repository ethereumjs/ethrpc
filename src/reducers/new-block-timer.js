"use strict";

var initialState = null;

module.exports = function (newBlockTimer, action) {
  if (typeof newBlockTimer === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_NEW_BLOCK_TIMER":
      return action.timer;
    case "CLEAR_NEW_BLOCK_TIMER":
      if (newBlockTimer) clearInterval(newBlockTimer); // mutation >:o
      return newBlockTimer;
    default:
      return newBlockTimer;
  }
};
