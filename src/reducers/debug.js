"use strict";

var assign = require("lodash.assign");
var initialState = require("./initial-state").debug;

module.exports = function (debug, action) {
  if (typeof debug === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_DEBUG_OPTIONS":
      return assign({}, debug, action.options);
    case "RESET_DEBUG_OPTIONS":
      return initialState;
    default:
      return debug;
  }
};
