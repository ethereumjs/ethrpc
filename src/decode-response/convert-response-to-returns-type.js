"use strict";

var clone = require("clone");
var speedomatic = require("speedomatic");

var convertResponseToReturnsType = function (returnsType, response) {
  var convertedResponse;
  if (!returnsType) return response;
  if (!response || response === "0x") return response;
  if (response.error) return response;
  returnsType = returnsType.toLowerCase();
  convertedResponse = clone(response);
  if (returnsType && returnsType.slice(-2) === "[]") {
    convertedResponse = speedomatic.unrollArray(convertedResponse, returnsType);
  }
  if (returnsType === "string") {
    return speedomatic.abiDecodeBytes(convertedResponse);
  } else if (returnsType === "number") {
    return speedomatic.encodeNumberAsBase10String(convertedResponse, true);
  } else if (returnsType === "unfix") {
    return speedomatic.unfixSigned(convertedResponse, "string");
  } else if (returnsType === "null") {
    return null;
  } else if (returnsType === "address" || returnsType === "address[]") {
    return speedomatic.formatEthereumAddress(convertedResponse);
  } else if (returnsType === "int256" || returnsType === "int256[]") {
    return speedomatic.formatInt256(convertedResponse);
  } else if (returnsType === "bytes32" || returnsType === "bytes32[]") {
    return speedomatic.hex(convertedResponse);
  }
  return convertedResponse;
};

module.exports = convertResponseToReturnsType;
