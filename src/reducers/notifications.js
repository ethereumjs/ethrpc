"use strict";

var assign = require("lodash.assign");
var initialState = require("./initial-state").notifications;

module.exports = function (notifications, action) {
  var newNotification;
  if (typeof notifications === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "ADD_NOTIFICATION":
      newNotification = {};
      newNotification[action.hash] = action.notification;
      return assign({}, notifications, newNotification);
    case "CLEAR_NOTIFICATION":
      return Object.keys(notifications).reduce(function (p, hash) {
        if (hash === action.hash) {
          if (notifications[hash]) clearTimeout(notifications[action.hash]);
        } else {
          p[hash] = notifications[hash];
        }
        return p;
      }, {});
    case "CLEAR_ALL_NOTIFICATIONS":
      Object.keys(notifications).map(function (hash) {
        if (notifications[hash]) clearTimeout(notifications[hash]);
      });
      return initialState;
    default:
      return notifications;
  }
};
