"use strict";

var clone = require("clone");
var ethereumjsAbi = require("ethereumjs-abi");
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
    if (returnsType === "hash[]") {
      convertedResponse = speedomatic.hex(convertedResponse);
    }
    return convertedResponse;
  } else if (returnsType === "string") {
    return ethereumjsAbi.rawDecode(["string"], Buffer.from(speedomatic.strip0xPrefix(convertedResponse), "hex"))[0];
  } else if (returnsType === "number") {
    return speedomatic.encodeNumberAsBase10String(convertedResponse, true);
  } else if (returnsType === "int") {
    return speedomatic.encodeNumberAsJSNumber(convertedResponse, true);
  } else if (returnsType === "bignumber") {
    return speedomatic.bignum(convertedResponse, null, true);
  } else if (returnsType === "unfix") {
    return speedomatic.unfixSigned(convertedResponse, "string");
  } else if (returnsType === "null") {
    return null;
  } else if (returnsType === "address" || returnsType === "address[]") {
    return speedomatic.formatEthereumAddress(convertedResponse);
  } else if (returnsType === "int256" || returnsType === "int256[]") {
    return speedomatic.formatInt256(convertedResponse);
  }
  return convertedResponse;
};

module.exports = convertResponseToReturnsType;
