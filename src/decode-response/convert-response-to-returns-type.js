"use strict";

var abi = require("augur-abi");
var clone = require("clone");

var convertResponseToReturnsType = function (returnsType, response) {
  var convertedResponse;
  if (!returnsType) return response;
  if (response && response !== "0x") {
    if (response.error) return response;
    returnsType = returnsType.toLowerCase();
    convertedResponse = clone(response);
    if (returnsType && returnsType.slice(-2) === "[]") {
      convertedResponse = abi.unroll_array(convertedResponse, returnsType);
      if (returnsType === "hash[]") {
        convertedResponse = abi.hex(convertedResponse);
      }
    } else if (returnsType === "string") {
      convertedResponse = abi.raw_decode_hex(convertedResponse);
    } else if (returnsType === "number") {
      convertedResponse = abi.string(convertedResponse, true);
    } else if (returnsType === "int") {
      convertedResponse = abi.number(convertedResponse, true);
    } else if (returnsType === "bignumber") {
      convertedResponse = abi.bignum(convertedResponse, null, true);
    } else if (returnsType === "unfix") {
      convertedResponse = abi.unfix_signed(convertedResponse, "string");
    } else if (returnsType === "null") {
      convertedResponse = null;
    } else if (returnsType === "address" || returnsType === "address[]") {
      convertedResponse = abi.format_address(convertedResponse);
    }
  } else {
    convertedResponse = response;
  }
  return convertedResponse;
};

module.exports = convertResponseToReturnsType;
