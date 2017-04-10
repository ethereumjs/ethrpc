"use strict";

var stripReturnsTypeAndInvocation = function (tx) {
  var returns;
  if (tx.method === "eth_coinbase") return "address";
  if (tx.params !== undefined && tx.params.length && tx.params[0]) {
    if (tx.params[0].returns) {
      returns = tx.params[0].returns;
      delete tx.params[0].returns;
    }
    if (tx.params[0].invocation) {
      delete tx.params[0].invocation;
    }
  }
  return returns;
};

module.exports = stripReturnsTypeAndInvocation;
