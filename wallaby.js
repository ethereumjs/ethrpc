module.exports = function () {
  return {
    "files": [
      "src/**/*.js",
      "src/**/*.json"
    ],
    "tests": [
      "test/**/*.js",
      "!test/sync-node-only.js",
      "!test/transporter.js"
    ],
    "testFramework": "mocha",
    "env": {
      "type": "node"
    },
    "workers": {
      "initial": 1,
      "regular": 1
    },
    setup: function (wallaby) {
      wallaby.testFramework.timeout(3000);
    }
  }
}
