"use strict";

var startPollingForBlocks = require("./start-polling-for-blocks");

function listenForNewBlocks() {
  return function (dispatch) {
    dispatch(startPollingForBlocks());
  };
}

module.exports = listenForNewBlocks;
