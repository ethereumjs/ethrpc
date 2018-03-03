/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var sha3 = require("../../src/utils/sha3");

describe("utils/sha3", function () {
  var test = function (t) {
    it(t.description, function (done) {
      t.assertions(sha3(t.params.data, t.params.encoding));
      sha3(t.params.data, t.params.encoding, function (hash) {
        t.assertions(hash);
        done();
      });
    });
  };
  // Test vectors:
  // https://github.com/ethereum/web3.js/blob/master/test/sha3.js
  // https://github.com/cryptocoinjs/keccak/blob/master/test/vectors-keccak.js
  test({
    description: "Empty string [no encoding specified]",
    params: {
      data: "",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
    },
  });
  test({
    description: "0x7400000000000000000000000000000000000000000000000000000000000000 [hex]",
    params: {
      data: "0x7400000000000000000000000000000000000000000000000000000000000000",
      encoding: "hex",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0xe30ee6d2afd3da9887a5d819e8df73b995e052a6d9c94e81166bb7213c87bb7f");
    },
  });
  test({
    description: "0x74 [hex]",
    params: {
      data: "0x74",
      encoding: "hex",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0xcac1bb71f0a97c8ac94ca9546b43178a9ad254c7b757ac07433aa6df35cd8089");
    },
  });
  test({
    description: "t [utf8]",
    params: {
      data: "t",
      encoding: "utf8",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0xcac1bb71f0a97c8ac94ca9546b43178a9ad254c7b757ac07433aa6df35cd8089");
    },
  });
  test({
    description: "0x000000000000000000000000391694e7e0b0cce554cb130d723a9d27458f92980000000000000000000000000000000000000000000000000000000000000001 [hex]",
    params: {
      data: "0x000000000000000000000000391694e7e0b0cce554cb130d723a9d27458f92980000000000000000000000000000000000000000000000000000000000000001",
      encoding: "hex",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0x6661e9d6d8b923d5bbaab1b96e1dd51ff6ea2a93520fdc9eb75d059238b8c5e9");
    },
  });
  test({
    description: "0x68656c6c6f20776f726c64 [utf8]",
    params: {
      data: "0x68656c6c6f20776f726c64",
      encoding: "hex",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad");
    },
  });
  test({
    description: "hello world [utf8]",
    params: {
      data: "hello world",
      encoding: "utf8",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad");
    },
  });
  test({
    description: "hello world [ascii]",
    params: {
      data: "hello world",
      encoding: "ascii",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad");
    },
  });
  test({
    description: "test123 [utf8]",
    params: {
      data: "test123",
      encoding: "utf8",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0xf81b517a242b218999ec8eec0ea6e2ddbef2a367a14e93f4a32a39e260f686ad");
    },
  });
  test({
    description: "test(int) [utf8]",
    params: {
      data: "test(int)",
      encoding: "utf8",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0xf4d03772bec1e62fbe8c5691e1a9101e520e8f8b5ca612123694632bf3cb51b1");
    },
  });
  test({
    description: "0x80 [hex]",
    params: {
      data: "0x80",
      encoding: "hex",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421");
    },
  });
  test({
    description: "0x80 [no encoding specified]",
    params: {
      data: "0x80",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0x6b03a5eef7706e3fb52a61c19ab1122fad7237726601ac665bd4def888f0e4a0");
    },
  });
  test({
    description: "0x3c9229289a6125f7fdf1885a77bb12c37a8d3b4962d936f7e3084dece32a3ca1 [hex]",
    params: {
      data: "0x3c9229289a6125f7fdf1885a77bb12c37a8d3b4962d936f7e3084dece32a3ca1",
      encoding: "hex",
    },
    assertions: function (hash) {
      assert.strictEqual(hash, "0x82ff40c0a986c6a5cfad4ddf4c3aa6996f1a7837f9c398e17e5de5cbd5a12b28");
    },
  });
});
