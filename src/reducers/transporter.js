"use strict";

var initialState = null;

module.exports = function (transporter, action) {
  if (typeof transporter === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_TRANSPORTER":
      return action.transporter;
    case "CLEAR_TRANSPORTER":
      return initialState;
    default:
      return transporter;
  }
};
