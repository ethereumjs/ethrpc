"use strict";

function isObject(item) {
  return (typeof item === "object" && !Array.isArray(item) && item !== null);
}

module.exports = isObject;
