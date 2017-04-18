"use strict";

var abi = require("augur-abi");
var clone = require("clone");

var convertResponseToReturnsType = function (returnsType, response) {
  var convertedResponse;
  if (!returnsType) return response;
  if (!response || response === "0x") return response;
  if (response.error) return response;
  returnsType = returnsType.toLowerCase();
  convertedResponse = clone(response);
  if (returnsType && returnsType.slice(-2) === "[]") {
    convertedResponse = abi.unroll_array(convertedResponse, returnsType);
    if (returnsType === "hash[]") {
      convertedResponse = abi.hex(convertedResponse);
    }
    return convertedResponse;
  } else if (returnsType === "string") {
    return abi.raw_decode_hex(convertedResponse);
  } else if (returnsType === "number") {
    return abi.string(convertedResponse, true);
  } else if (returnsType === "int") {
    return abi.number(convertedResponse, true);
  } else if (returnsType === "bignumber") {
    return abi.bignum(convertedResponse, null, true);
  } else if (returnsType === "unfix") {
    return abi.unfix_signed(convertedResponse, "string");
  } else if (returnsType === "null") {
    return null;
  } else if (returnsType === "address" || returnsType === "address[]") {
    return abi.format_address(convertedResponse);
  }
  return convertedResponse;
};

module.exports = convertResponseToReturnsType;
