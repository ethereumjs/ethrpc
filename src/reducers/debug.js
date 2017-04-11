"use strict";

var assign = require("lodash.assign");

var initialState = {
  connect: false,
  tx: false,
  broadcast: false,
  nonce: false,
  sync: false
};

module.exports = function (debug, action) {
  var debugType;
  if (typeof debug === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_DEBUG_LOGGING":
      debugType = {};
      debugType[action.id] = action.debug;
      return assign({}, debug, debugType);
    case "RESET_DEBUG_LOGGING":
      return initialState;
    default:
      return debug;
  }
};
