"use strict";

var isNodeJs = require("./is-node-js");

module.exports = isNodeJs ? require("request") : require("browser-request");
