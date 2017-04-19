"use strict";

/**
 * A base class for objects that want to support users subscribing/unsubscribing from notifications.
 */
function Notifier() {
  var nextListenerId = 1;
  var subscribers = {};

  this.subscribe = function (callback) {
    var token = (nextListenerId++).toString();
    subscribers[token] = callback;
    return token;
  };

  this.unsubscribe = function (token) {
    delete subscribers[token];
  };

  this.unsubscribeAll = function () {
    nextListenerId = 1;
    subscribers = {};
  };

  this.notifySubscribers = function (args) {
    args = arguments;
    Object.keys(subscribers).forEach(function (key) {
      var subscriber = subscribers[key];
      // NOTE: calling apply on a bound function will *NOT* change the context, despite what one might expect
      subscriber.apply(undefined, args);
    });
  };
}

Notifier.prototype.constructor = Notifier;

module.exports = Notifier;
