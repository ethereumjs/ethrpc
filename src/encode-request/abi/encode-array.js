"use strict";

var encodePrimitive = require("./encode-primitive");

var encodeArray = function (array) {
  var i;
  if (!(array instanceof Array)) throw new Error("array must be an array.");
  for (i = 0; i < array.length; ++i) {
    array[i] = encodePrimitive(array[i]);
  }
  return array;
};

module.exports = encodeArray;
