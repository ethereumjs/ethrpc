"use strict";

var initialState = null;

module.exports = function (shimMessageHandler, action) {
  if (typeof shimMessageHandler === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_SHIM_MESSAGE_HANDLER":
      return action.shimMessageHandler;
    case "CLEAR_SHIM_MESSAGE_HANDLER":
      return initialState;
    default:
      return shimMessageHandler;
  }
};
