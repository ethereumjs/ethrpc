"use strict";

var blockchainMessageHandler = require("../rpc/blockchain-message-handler");
var noop = require("../utils/noop");

module.exports = function (shimMessageHandlerObject, action) {
  if (typeof shimMessageHandlerObject === "undefined") {
    return { realMessageHandler: blockchainMessageHandler };
    // return {
    //   shimMessageHandlerObject: shimMessageHandlerObject,
    //   shimMessageHandler: function (error, jso) {
    //     this.realMessageHandler(error, jso);
    //   }.bind(shimMessageHandlerObject)
    // };
  }
  switch (action.type) {
    case "IGNORE_SHIM_MESSAGE_HANDLER":
      shimMessageHandlerObject.realMessageHandler = noop; // mutation!
      return shimMessageHandlerObject;
    default:
      return shimMessageHandlerObject;
  }
};
