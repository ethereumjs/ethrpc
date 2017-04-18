"use strict";

var assign = require("lodash.assign");
var initialState = require("./initial-state").noRelay;

module.exports = function (noRelay, action) {
  var newNoRelay;
  if (typeof noRelay === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "EXCLUDE_METHOD_FROM_TRANSACTION_RELAY":
      newNoRelay = {};
      newNoRelay[action.method] = true;
      return assign({}, noRelay, newNoRelay);
    case "INCLUDE_METHOD_IN_TRANSACTION_RELAY":
      newNoRelay = {};
      newNoRelay[action.method] = false;
      return assign({}, noRelay, newNoRelay);
    case "CLEAR_NO_RELAY":
      return initialState;
    default:
      return noRelay;
  }
};
