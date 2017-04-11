"use strict";

var blockchainMessageHandler = require("../rpc/blockchain-message-handler");
var noop = require("../utils/noop");

var initialState = { realMessageHandler: blockchainMessageHandler };

module.exports = function (shimMessageHandlerObject, action) {
  if (typeof shimMessageHandlerObject === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "REDIRECT_SHIM_MESSAGE_HANDLER":
      return { realMessageHandler: noop };
    case "SET_SHIM_MESSAGE_HANDLER_OBJECT":
      return action.shimMessageHandlerObject;
    case "CLEAR_SHIM_MESSAGE_HANDLER_OBJECT":
      return initialState;
    default:
      return shimMessageHandlerObject;
  }
};
