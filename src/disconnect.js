"use strict";

var destroyBlockandLogStreamer = require("./block-management/destroy-block-and-log-streamer");

function disconnect() {
  return function (dispatch, getState) {
    dispatch(destroyBlockandLogStreamer());

    internalState.get("transporter").close();
  };
}
