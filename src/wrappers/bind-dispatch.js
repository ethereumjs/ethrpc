"use strict";

var bindDispatchToMethod = require("./bind-dispatch-to-method");

function bindDispatch(dispatch, namespace) {
  return Object.keys(namespace).reduce(function (p, method) {
    p[method] = bindDispatchToMethod(dispatch, namespace[method]);
    return p;
  }, {});
}

module.exports = bindDispatch;
