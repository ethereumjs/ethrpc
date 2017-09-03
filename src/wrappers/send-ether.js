"use strict";

var speedomatic = require("speedomatic");
var transact = require("../transact/transact");
var isObject = require("../utils/is-object");

// TODO remove flexible function signature
function sendEther(to, value, from, onSent, onSuccess, onFailed) {
  return function (dispatch) {
    if (isObject(to)) {
      value = to.value;
      from = to.from;
      onSent = to.onSent;
      onSuccess = to.onSuccess;
      onFailed = to.onFailed;
      to = to.to;
    }
    return dispatch(transact({
      from: from,
      to: to,
      value: speedomatic.fix(value, "hex"),
      returns: "null",
      gas: "0xcf08"
    }, null, onSent, onSuccess, onFailed));
  };
}

module.exports = sendEther;
