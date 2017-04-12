"use strict";

var raw = require("./raw");

function makeWrapper(command) {
  return function (params, callback) {
    return function (dispatch) {
      return dispatch(raw(command, params, callback));
    };
  };
}

module.exports = makeWrapper;
