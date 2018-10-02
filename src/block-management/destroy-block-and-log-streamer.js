"use strict";

var internalState = require("../internal-state");

function destroyBlockAndLogStreamer() {
  return function () {
    internalState.set("blockAndLogStreamer", null);
  };
}

module.exports = destroyBlockAndLogStreamer;
