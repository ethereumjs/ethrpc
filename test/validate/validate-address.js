/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var validateAddress = require("../../src/validate/validate-address");

var uppercaseAddresses = [
    "0x52908400098527886E0F7030069857D2E4169EE7",
    "0x8617E340B3D01FA5F11F306F4090FD50E238070D"
]

var lowercaseAddresses = [
    "0xde709f2102306220921060314715629080e2fb77",
    "0x27b1fdb04752bbc536007a920d24acb045561c26"
]

var normalAddresses = [
    "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
    '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
    "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
    "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb"
]

var wrongCapitalizationAddresses = [
    "0x5aaeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
    '0xfb6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
    "0xdbf03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
    "0xd1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb"
]

describe("validate/validate-address", function () {
    var test = function (t) {
        it(t.description, function () {
            t.assertions(validateAddress(t.s) === t.s);
        });
    };

    var testInvalidChecksum = function (t) {
        it(t.description, function () {
            t.assertions(validateAddress);
        });
    };

    uppercaseAddresses.forEach((address) => {
        test({
            description: "uppercase address:" + address,
            s: address,
            assertions: function (validateAddress) {
                assert.isTrue(validateAddress);
            }
        });
    });

    lowercaseAddresses.forEach((address) => {
        test({
            description: "lowercase address:" + address,
            s: address,
            assertions: function (validateAddress) {
                assert.isTrue(validateAddress);
            }
        });
    });
    normalAddresses.forEach((address) => {
        test({
            description: "normal address:" + address,
            s: address,
            assertions: function (validateAddress) {
                assert.isTrue(validateAddress);
            }
        });
    });

    wrongCapitalizationAddresses.forEach((address) => {
        testInvalidChecksum({
            description: "wrong capitalization address:" + address,
            s: address,
            assertions: function (validateAddress) {
                assert.throws(validateAddress);
            }
        });
    });
});
