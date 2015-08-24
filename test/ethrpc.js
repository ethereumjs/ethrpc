/**
 * ethrpc unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var assert = require("chai").assert;
var contracts = require("augur-contracts").privatechain;
var rpc = require("../");

require('it-each')({ testPerIteration: true });

rpc.bignumbers = false;

var TIMEOUT = 60000;
var COINBASE = "0xaff9cb4dcb19d13b84761c040c91d21dc6c991ec";
var SHA3_INPUT = "boom!";
var SHA3_DIGEST = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
var PROTOCOL_VERSION = "61";

var requests = 0;

describe("marshal", function () {

    var test = function (t) {
        it(t.prefix + t.command + " -> " + JSON.stringify(t.expected), function () {
            assert.deepEqual(
                rpc.marshal(t.command, t.params || [], t.prefix),
                t.expected
            );
        });
    };

    test({
        prefix: "eth_",
        command: "coinbase",
        expected: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "eth_coinbase",
            params: []
        }
    });
    test({
        prefix: "web3_",
        command: "sha3",
        params: "boom!",
        expected: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "web3_sha3",
            params: ["boom!"]
        }
    });
    test({
        prefix: "net_",
        command: "listening",
        expected: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "net_listening",
            params: []
        }
    });
    test({
        prefix: "eth_",
        command: "protocolVersion",
        expected: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "eth_protocolVersion",
            params: []
        }
    });

});

describe("broadcast", function () {

    var test = function (t) {
        it(JSON.stringify(t.command) + " -> " + t.expected, function (done) {
            this.timeout(TIMEOUT);

            // synchronous
            var response = rpc.broadcast(t.command);
            if (response.error) {
                done(response);
            } else {
                assert.strictEqual(response, t.expected);

                // asynchronous
                rpc.broadcast(t.command, function (res) {
                    if (res.error) {
                        done(res);
                    } else {
                        assert.strictEqual(res, t.expected);
                        done();
                    }
                });
            }
        });
    };

    test({
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "eth_coinbase",
            params: []
        },
        expected: COINBASE
    });
    test({
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "web3_sha3",
            params: [SHA3_INPUT]
        },
        expected: SHA3_DIGEST
    });
    test({
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "net_listening",
            params: []
        },
        expected: true
    });
    test({
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "eth_protocolVersion",
            params: []
        },
        expected: PROTOCOL_VERSION
    });

});

describe("post", function () {

    var test = function (t) {
        it(t.command + " -> " + t.expected, function (done) {
            this.timeout(TIMEOUT);
            rpc.post(t.node, t.command, t.returns, function (res) {
                if (res.error) {
                    done(res);
                } else {
                    assert.strictEqual(res, t.expected);
                    done();
                }
            });
        });
    };

    test({
        node: "http://eth1.augur.net:8545",
        command: JSON.stringify({
            id: ++requests,
            jsonrpc: "2.0",
            method: "eth_coinbase",
            params: []
        }),
        expected: COINBASE
    });
    test({
        node: "http://eth1.augur.net:8545",
        command: JSON.stringify({
            id: ++requests,
            jsonrpc: "2.0",
            method: "web3_sha3",
            params: [SHA3_INPUT]
        }),
        expected: SHA3_DIGEST
    });
    test({
        node: "http://eth1.augur.net:8545",
        command: JSON.stringify({
            id: ++requests,
            jsonrpc: "2.0",
            method: "net_listening",
            params: []
        }),
        expected: true
    });
    test({
        node: "http://eth1.augur.net:8545",
        command: JSON.stringify({
            id: ++requests,
            jsonrpc: "2.0",
            method: "eth_protocolVersion",
            params: []
        }),
        expected: PROTOCOL_VERSION
    });

});

describe("postSync", function () {

    var test = function (t) {
        it(JSON.stringify(t.command) + " -> " + t.expected, function (done) {
            this.timeout(TIMEOUT);
            var res = rpc.postSync(t.node, t.command, t.returns);
            if (res.error) {
                done(res.error);
            } else {
                assert.strictEqual(res, t.expected);
                done();
            }
        });
    };

    test({
        node: "http://eth1.augur.net:8545",
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "eth_coinbase",
            params: []
        },
        expected: COINBASE
    });
    test({
        node: "http://eth1.augur.net:8545",
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "web3_sha3",
            params: [SHA3_INPUT]
        },
        expected: SHA3_DIGEST
    });
    test({
        node: "http://eth1.augur.net:8545",
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "net_listening",
            params: []
        },
        expected: true
    });
    test({
        node: "http://eth1.augur.net:8545",
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "eth_protocolVersion",
            params: []
        },
        expected: PROTOCOL_VERSION
    });

});

describe("multicast", function () {

    rpc.nodes = [
        "http://eth1.augur.net:8545",
        "http://eth3.augur.net:8545",
        "http://eth4.augur.net:8545"
    ];

    var command = {
        id: ++requests,
        jsonrpc: "2.0",
        method: "eth_protocolVersion",
        params: []
    };

    it.each(
        rpc.nodes,
        "[sync] post " + command.method + " RPC to %s",
        ["element"],
        function (element, next) {
            this.timeout(TIMEOUT);
            assert.strictEqual(rpc.postSync(element, command), PROTOCOL_VERSION);
            next();
        }
    );

    it.each(
        rpc.nodes,
        "[async] post " + command.method + " RPC to %s",
        ["element"],
        function (element, next) {
            this.timeout(TIMEOUT);
            rpc.post(element, JSON.stringify(command), null, function (response) {
                assert.strictEqual(response, PROTOCOL_VERSION);
                next();
            });
        }
    );

    it("call back after first asynchronous response", function (done) {
        this.timeout(TIMEOUT);
        rpc.broadcast(command, function (response) {
            assert.strictEqual(response, PROTOCOL_VERSION);
            done();
        });
    }); 

    it("return after first synchronous response", function (done) {
        assert.strictEqual(rpc.broadcast(command), PROTOCOL_VERSION);
        done();
    });

});

describe("Ethereum bindings", function () {

    it("raw('eth_coinbase')", function () {
        assert.strictEqual(rpc.raw("eth_coinbase"), COINBASE);
    });

    it("eth('coinbase')", function () {
        assert.strictEqual(COINBASE, rpc.eth("coinbase"));
    });

    it("eth('protocolVersion')", function () {
        assert.strictEqual(rpc.eth("protocolVersion"), "61");
    });

    it("web3_sha3('" + SHA3_INPUT + "')", function () {
        assert.strictEqual(rpc.web3("sha3", SHA3_INPUT), SHA3_DIGEST);
        assert.strictEqual(rpc.sha3(SHA3_INPUT), SHA3_DIGEST);
    });

    it("leveldb('putString')", function () {
        assert.isTrue(
            rpc.leveldb("putString", ["augur_test_DB", "boomkey", "boom!"])
        );
    });

    it("leveldb('getString')", function () {
        rpc.leveldb("putString", ["augur_test_DB", "boomkey", "boom!"]);
        assert.strictEqual(
            rpc.leveldb("getString", ["augur_test_DB", "boomkey"]), "boom!"
        );
    });

    it("gasPrice", function () {
        assert(parseInt(rpc.gasPrice()) >= 0);
    });

    it("blockNumber", function () {
        assert(parseFloat(rpc.blockNumber()) >= 0);
    });

    it("balance", function () {
        assert(parseInt(rpc.balance()) >= 0);
    });

    it("txCount", function () {
        assert(parseInt(rpc.txCount()) >= 0);
    });

    it("peerCount", function () {
        this.timeout(TIMEOUT);
        assert(parseInt(rpc.peerCount()) >= 0);
    });

});

describe("Contract methods", function () {

    var cashFaucet = {
        to: contracts.faucets,
        from: COINBASE,
        method: "cashFaucet",
        send: false
    };

    it("cashFaucet -> raw", function () {
        assert.include([
            "0x01",
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        ], rpc.invoke(cashFaucet));
    });

    it("cashFaucet -> number", function () {
        cashFaucet.returns = "number";
        assert.include(["1", "-1"], rpc.invoke(cashFaucet));
    });

    var test = function (tx, expected, apply) {
        tx.send = false;
        if (tx && expected) {
            var res = rpc.invoke(tx);
            if (res) {
                if (apply) {
                    if (res && res.constructor === Array) {
                        assert.deepEqual(apply(res), apply(expected));
                    } else {
                        assert.strictEqual(apply(res), apply(expected));
                    }
                } else {
                    if (res && res.constructor === Array) {
                        assert.deepEqual(res, expected);
                    } else {
                        assert.strictEqual(res, expected);
                    }
                }
            } else {
                throw new Error("no or incorrect response: " + JSON.stringify(res));
            }
        }
    };

    it("getMarkets(1010101) -> hash[]", function () {
            test({
                to: contracts.branches,
                from: COINBASE,
                method: "getMarkets",
                signature: "i",
                returns: "hash[]",
                params: 1010101
            }, ["0xe8", "0xe8"], function (a) {
                a.slice(1, 2);
            });
        }
    );

});

describe("Batch RPC", function () {

    var test = function (res) {
        assert.isArray(res);
        assert.strictEqual(res.length, 2);
        assert(parseInt(res[0]) === 1 || parseInt(res[0]) === -1);
        assert(parseInt(res[1]) === 1 || parseInt(res[1]) === -1);
    };

    var txList = [
        {
            to: contracts.faucets,
            method: "cashFaucet",
            returns: "number",
            send: false
        },
        {
            to: contracts.faucets,
            method: "reputationFaucet",
            signature: "i",
            params: "0xf69b5",
            returns: "number",
            send: false
        }
    ];

    it("sync: return and match separate calls", function () {
        test(rpc.batch(txList));
    });

    it("async: callback on whole array", function (done) {
        rpc.batch(txList, function (r) {
            test(r); done();
        });
    });

});
