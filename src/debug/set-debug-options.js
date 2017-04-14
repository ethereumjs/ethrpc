"use strict";

module.exports = function (debugOptions) {
  return function (dispatch) {
    dispatch({ type: "SET_DEBUG_OPTIONS", options: debugOptions });
  };
};
