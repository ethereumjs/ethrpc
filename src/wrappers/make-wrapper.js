"use strict";

var raw = require("./raw");
var isFunction = require("../utils/is-function");

function makeWrapper(command) {
  return function (params, callback) {
    return function (dispatch) {
      if (callback === undefined && isFunction(params)) {
        return dispatch(raw(command, [], params));
      }
      return dispatch(raw(command, params, callback));
    };
  };
}

module.exports = makeWrapper;
