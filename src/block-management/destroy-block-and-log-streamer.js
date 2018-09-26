"use strict";

var internalState = require("../internal-state");

function destroyBlockAndLogStreamer() {
  return function (dispatch, getState) {
    internalState.set("blockAndLogStreamer", null);
  };
}

module.exports = destroyBlockAndLogStreamer;
