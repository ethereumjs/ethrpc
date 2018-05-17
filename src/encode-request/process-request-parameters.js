"use strict";

var speedomatic = require("speedomatic");
var RPCError = require("../errors/rpc-error");

function processRequestParameters(params, signature) {
  if (params == null) {
    params = [];
  } else if (!Array.isArray(params)) {
    params = [params];
  }
  var numParams = params.length;
  if (numParams) {
    if (signature && signature.length !== numParams) {
      throw new RPCError("PARAMETER_NUMBER_ERROR");
    }
    for (var j = 0; j < numParams; ++j) {
      if (params[j] != null && signature[j] != null) {
        if (params[j].constructor === Number) {
          params[j] = speedomatic.prefixHex(params[j].toString(16));
        }
        if (signature[j] === "int256") {
          params[j] = speedomatic.unfork(params[j], true);
        } else if (signature[j] === "int256[]" && Array.isArray(params[j]) && params[j].length) {
          for (var k = 0, arrayLen = params[j].length; k < arrayLen; ++k) {
            params[j][k] = speedomatic.unfork(params[j][k], true);
          }
        }
      }
    }
  }
  return params;
}

module.exports = processRequestParameters;
