"use strict";

var wait = function (delay) {
  var until = new Date().getTime() + delay;
  while (new Date().getTime() < until) {} // eslint-disable-line no-empty
  return;
};

module.exports = wait;
