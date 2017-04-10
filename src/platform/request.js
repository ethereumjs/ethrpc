"use strict";

var isNodeJs = require("./is-node-js.js");
if (isNodeJs)  {module.exports = require("request");} else	{module.exports = require("browser-request");}
