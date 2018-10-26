"use strict";

var isNode = require("./is-node-js.js");
if (isNode)  {module.exports = require("websocket").w3cwebsocket;} else	{module.exports = WebSocket;}
