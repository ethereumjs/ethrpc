"use strict";

var destroyBlockandLogStreamer = require("./block-management/destroy-block-and-log-streamer");
var internalState = require("./internal-state");

function disconnect() {
  return function (dispatch) {
    dispatch(destroyBlockandLogStreamer());

    if (internalState.get("transporter") !== null) internalState.get("transporter").close();
  };
}

module.exports = disconnect;
