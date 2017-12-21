/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var validateAddress = require("../../src/validate/validate-address");

describe("validate/validate-address", function () {
    var test = function (t) {
        it(t.description, function () {
            t.assertions(validateAddress(t.s) == t.s);
        });
    };
    test({
        description: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
        s: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
        assertions: function (validateAddress) {
            assert.isTrue(validateAddress);
        }
    });
    test({
        description: "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
        s: "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
        assertions: function (validateAddress) {
            assert.isTrue(validateAddress);
        }
    });
    test({
        description: "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
        s: "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
        assertions: function (validateAddress) {
            assert.isTrue(validateAddress);
        }
    });
    test({
        description: "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb",
        s: "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb",
        assertions: function (validateAddress) {
            assert.isTrue(validateAddress);
        }
    });
});
