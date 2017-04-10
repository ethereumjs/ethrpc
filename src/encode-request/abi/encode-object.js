"use strict";

var encodePrimitive = require("./encode-primitive");

var encodeObject = function (object) {
  var property;
  for (property in object) {
    if (object.hasOwnProperty(property)) {
      object[property] = encodePrimitive(object[property]);
    }
  }
  return object;
};

module.exports = encodeObject;
