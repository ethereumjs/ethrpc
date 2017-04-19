"use strict";

var makeWrapper = require("./make-wrapper");

module.exports = {
  start: makeWrapper("miner_start"),
  stop: makeWrapper("miner_stop")
};
