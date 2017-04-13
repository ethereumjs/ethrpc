"use strict";

var blockchainMessageHandler = require("../rpc/blockchain-message-handler");

module.exports = function (shimMessageHandlerObject, action) {
  if (typeof shimMessageHandlerObject === "undefined") {
    return { realMessageHandler: blockchainMessageHandler };
  }
  switch (action.type) {
    case "REDIRECT_SHIM_MESSAGE_HANDLER":
      shimMessageHandlerObject.realMessageHandler = action.redirect; // mutation >:o
      return shimMessageHandlerObject;
    default:
      return shimMessageHandlerObject;
  }
};
