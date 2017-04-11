"use strict";

var clone = require("clone");

var initialState = {};

module.exports = function (noRelay, action) {
  var updatedNoRelay;
  if (typeof noRelay === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "EXCLUDE_METHOD_FROM_TRANSACTION_RELAY":
      updatedNoRelay = clone(noRelay);
      updatedNoRelay[action.method] = true;
      return updatedNoRelay;
    case "INCLUDE_METHOD_IN_TRANSACTION_RELAY":
      updatedNoRelay = clone(noRelay);
      updatedNoRelay[action.method] = false;
      return updatedNoRelay;
    case "CLEAR_NO_RELAY":
      return initialState;
    default:
      return noRelay;
  }
};
