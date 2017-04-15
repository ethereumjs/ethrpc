"use strict";

function immutableDelete(obj, deletionKey) {
  return Object.keys(obj).reduce(function (p, key) {
    if (key !== deletionKey) p[key] = obj[key];
    return p;
  }, {});
}

module.exports = immutableDelete;
