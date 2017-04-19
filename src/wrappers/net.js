"use strict";

var makeWrapper = require("./make-wrapper");

module.exports = {
  listening: makeWrapper("net_listening"),
  version: makeWrapper("net_version"),
  peerCount: makeWrapper("net_peerCount")
};
