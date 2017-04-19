"use strict";

var isFunction = require("../utils/is-function");
var initialState = require("./initial-state").configuration;

module.exports = function (configuration, action) {
  var updatedConfiguration;
  if (typeof configuration === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_CONFIGURATION":
      updatedConfiguration = Object.keys(configuration).reduce(function (p, key) {
        if (action.configuration[key] != null && !isFunction(action.configuration[key])) {
          p[key] = action.configuration[key];
        } else {
          p[key] = configuration[key];
        }
        return p;
      }, {});
      return updatedConfiguration;
    case "RESET_CONFIGURATION":
      return initialState;
    default:
      return configuration;
  }
};
