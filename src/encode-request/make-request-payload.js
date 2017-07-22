"use strict";

var abiEncode = require("./abi-encode");
var encodeArray = abiEncode.encodeArray;
var encodePrimitive = abiEncode.encodePrimitive;

var numRequests = 1;

var makeRequestPayload = function (command, params, prefix) {
  var payload, method;
  if (prefix === "null" || prefix === null) {
    method = command.toString();
  } else {
    method = (prefix || "eth_") + command.toString();
  }
  payload = {
    id: numRequests++,
    jsonrpc: "2.0",
    method: method
  };
  if (params === undefined || params === null) params = [];
  payload.params = (Array.isArray(params)) ? encodeArray(params) : [encodePrimitive(params)];
  return payload;
};

module.exports = makeRequestPayload;
