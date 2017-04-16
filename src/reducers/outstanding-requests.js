"use strict";

var assign = require("lodash.assign");
var immutableDelete = require("immutable-delete");

var initialState = {};

module.exports = function (outstandingRequests, action) {
  var request;
  if (typeof outstandingRequests === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "ADD_OUTSTANDING_REQUEST":
      request = {};
      request[action.id] = action.request;
      return assign({}, outstandingRequests, request);
    case "REMOVE_OUTSTANDING_REQUEST":
      return immutableDelete(outstandingRequests, action.id.toString());
    case "REMOVE_ALL_OUTSTANDING_REQUESTS":
      return initialState;
    default:
      return outstandingRequests;
  }
};
