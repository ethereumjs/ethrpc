"use strict";

var clone = require("clone");

var initialState = {};

module.exports = function (notifications, action) {
  var updatedNotifications;
  if (typeof notifications === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "ADD_NOTIFICATION":
      updatedNotifications = clone(notifications);
      updatedNotifications[action.hash] = action.notification;
      return updatedNotifications;
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
