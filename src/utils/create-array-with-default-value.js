"use strict";

var createArrayWithDefaultValue = function (size, defaultValue) {
  return Array.apply(null, Array(size)).map(function () {
    return defaultValue;
  });
};

module.exports = createArrayWithDefaultValue;
