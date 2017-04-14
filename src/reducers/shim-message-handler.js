"use strict";

var noop = require("../utils/noop");

var initialState = noop;

module.exports = function (shimMessageHandler, action) {
  if (typeof shimMessageHandler === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_SHIM_MESSAGE_HANDLER":
      return action.messageHandler;
    default:
      return shimMessageHandler;
  }
};
