"use strict";

function bindDispatchToMethod(dispatch, method) {
  return function (params, callback) {
    return dispatch(method(params, callback));
  };
}

module.exports = bindDispatchToMethod;
