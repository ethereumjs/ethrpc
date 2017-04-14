"use strict";

var assign = require("lodash.assign");

var initialState = {};

module.exports = function (outstandingRequests, action) {
  var request, idString;
  if (typeof outstandingRequests === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "ADD_OUTSTANDING_REQUEST":
      request = {};
      request[action.id] = action.request;
      return assign({}, outstandingRequests, request);
    case "REMOVE_OUTSTANDING_REQUEST":
      idString = action.id.toString();
      return Object.keys(outstandingRequests).reduce(function (p, id) {
        if (id !== idString) p[id] = outstandingRequests[id];
        return p;
      }, {});
    case "REMOVE_ALL_OUTSTANDING_REQUESTS":
      return initialState;
    default:
      return outstandingRequests;
  }
};
