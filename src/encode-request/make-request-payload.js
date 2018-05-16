"use strict";

var assign = require("lodash").assign;
var abiEncode = require("./abi-encode");
var encodeArray = abiEncode.encodeArray;
var encodePrimitive = abiEncode.encodePrimitive;

var numRequests = 1;

var makeRequestPayload = function (command, params, prefix) {
  var method;
  if (prefix === "null" || prefix === null) {
    method = command.toString();
  } else {
    method = (prefix || "eth_") + command.toString();
  }
  var payload = {
    id: numRequests++,
    jsonrpc: "2.0",
    method: method,
  };
  if (params == null) params = [];
  return assign({}, payload, {
    params: (Array.isArray(params)) ? encodeArray(params) : [encodePrimitive(params)],
  });
};

module.exports = makeRequestPayload;
