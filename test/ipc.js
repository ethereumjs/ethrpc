/**
 * ethrpc unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var path = require("path");
var cp = require("child_process");
var chalk = require("chalk");
var assert = require("chai").assert;
var async = require("async");
var contracts = require("augur-contracts");
var abi = require("augur-abi");
var rpc = require("../");
var errors = require("../errors");

require('it-each')({ testPerIteration: true });

var DEBUG = false;
var DATADIR = "/home/jack/.augur-test";
var COINBASE = "0x05ae1d0ca6206c6168b42efcd1fbe0ed144e821b";

var TIMEOUT = 360000;
var SHA3_INPUT = "boom!";
var SHA3_DIGEST = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
var PROTOCOL_VERSION = "62";
var NETWORK_ID = "10101";

rpc.reset();
rpc.balancer = false;
rpc.ipcpath = path.join(DATADIR, "geth.ipc");
contracts = contracts[NETWORK_ID];

var callbacks = {
    onSent: function (res) {
        assert.property(res, "txHash");
        assert.property(res, "callReturn");
        assert.strictEqual(res.txHash.length, 66);
    },
    onSuccess: function (res) {
        assert.property(res, "txHash");
        assert.property(res, "callReturn");
        assert.property(res, "blockHash");
        assert.property(res, "blockNumber");
        assert.property(res, "nonce");
        assert.property(res, "transactionIndex");
        assert.property(res, "gas");
        assert.property(res, "gasPrice");
        assert.property(res, "input");
        assert.strictEqual(res.txHash.length, 66);
        assert.strictEqual(res.callReturn, "1");
        assert.isAbove(parseInt(res.blockNumber), 0);
        assert.isAbove(parseInt(res.nonce), 0);
        assert.strictEqual(res.from, COINBASE);
        assert.strictEqual(res.to, contracts.faucets);
        assert.strictEqual(abi.number(res.value), 0);
    }
};

var requests = 0;
var geth;

process.on("exit", function () { if (geth) geth.kill(); });

before(function (done) {
    this.timeout(TIMEOUT);
    geth = cp.spawn("geth", [
        "--etherbase", COINBASE,
        "--unlock", COINBASE,
        "--mine",
        "--nodiscover",
        "--networkid", NETWORK_ID,
        "--port", 30304,
        "--rpcport", 8547,
        "--rpc",
        "--datadir", DATADIR,
        "--password", path.join(DATADIR, ".password")
    ]);
    geth.stdout.on("data", function (data) {
        if (DEBUG) {
            process.stdout.write(chalk.cyan.dim(data));
        }
    });
    geth.stderr.on("data", function (data) {
        if (DEBUG) {
            process.stdout.write(chalk.white.dim(data));
        }
        if (data.toString().indexOf("IPC service started") > -1) {
            done();
        }
    });
    geth.on("close", function (code) {
        if (code !== 2 && code !== 0) geth.kill();
    });
});

after(function (done) {
    if (geth) geth.kill();
    done();
});

describe("IPC", function () {

    describe("marshal", function () {

        var test = function (t) {
            it(t.prefix + t.command + " -> " + JSON.stringify(t.expected), function () {
                var actual = rpc.marshal(t.command, t.params || [], t.prefix);
                actual.id = t.expected.id;
                assert.deepEqual(actual, t.expected);
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

                // asynchronous
                rpc.broadcast(t.command, function (res) {
                    if (res.error) return done(res);
                    assert.strictEqual(res, t.expected);
                    done();
                });
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

    describe("listening", function () {

        var test = function (t) {
            it(t.node + " -> " + t.listening, function (done) {
                this.timeout(TIMEOUT);
                rpc.listening(function (listening) {
                    assert.strictEqual(listening, t.listening);
                    done();
                });
            });
        };

        test({ listening: true });

    });

    describe("version (network ID)", function () {

        var test = function (t) {
            it(t.node + " -> " + t.version, function (done) {
                this.timeout(TIMEOUT);
                rpc.version(function (version) {
                    if (version.error) return done(version);
                    assert.strictEqual(version, t.version);
                    done();
                });
            });
        };

        test({ version: NETWORK_ID });

    });

    describe("unlocked", function () {

        var test = function (t) {
            it(t.node + " -> " + t.unlocked, function (done) {
                this.timeout(TIMEOUT);
                rpc.unlocked(t.account, function (unlocked) {
                    if (unlocked.error) return done(unlocked);
                    assert.strictEqual(unlocked, t.unlocked);
                    done();
                });
            });
        };

        test({
            account: COINBASE,
            unlocked: true
        });

    });

    describe("getBlock", function () {

        var asserts = function (t, block) {
            assert.property(block, "number");
            assert.property(block, "parentHash");
            assert.property(block, "hash");
            assert.property(block, "nonce");
            assert.property(block, "sha3Uncles");
            assert.property(block, "logsBloom");
            assert.property(block, "transactionsRoot");
            assert.property(block, "stateRoot");
            assert.property(block, "miner");
            assert.property(block, "difficulty");
            assert.property(block, "totalDifficulty");
            assert.property(block, "size");
            assert.property(block, "extraData");
            assert.property(block, "gasLimit");
            assert.property(block, "gasUsed");
            assert.property(block, "timestamp");
            assert.property(block, "transactions");
            assert.property(block, "uncles");
            assert.isAbove(parseInt(block.number), 0);
            assert.isAbove(parseInt(block.hash), 0);
            assert.isAbove(parseInt(block.parentHash), 0);
            assert.isAbove(parseInt(block.nonce), 0);
            assert.isAbove(parseInt(block.sha3Uncles), 0);
            assert.isAbove(parseInt(block.transactionsRoot), 0);
            assert.isAbove(parseInt(block.stateRoot), 0);
            assert.isAbove(parseInt(block.miner), 0);
            assert.isAbove(parseInt(block.difficulty), 0);
            assert.isAbove(parseInt(block.totalDifficulty), 0);
            assert.isAbove(parseInt(block.gasLimit), 0);
            assert.isAbove(parseInt(block.timestamp), 0);
            assert.isAbove(parseInt(block.number), 0);
            assert.isArray(block.transactions);
            assert.isArray(block.uncles);
            assert.strictEqual(parseInt(block.number), parseInt(t.blockNumber));
            assert.strictEqual(block.hash, t.blockHash);
        };

        var test = function (t) {
            it(t.blockNumber + " -> " + t.blockHash, function (done) {
                this.timeout(TIMEOUT);
                rpc.getBlock(t.blockNumber, true, function (block) {
                    if (block.error) return done(block);
                    asserts(t, block);
                    done();
                });
            });
        };

        // expected block hashes for network 10101
        test({
            blockNumber: "0x1",
            blockHash: "0x9f9954b5da59d78d248c0fcc742e3256c38fce7733c02ae5af3d67d649633e91"
        });
        test({
            blockNumber: "0x1b4",
            blockHash: "0x0b8cac64fb0f4a9effc4156b6a7a076a0ad842833de7d6280971caadb0a45b44"
        });
        test({
            blockNumber: "0x24f2",
            blockHash: "0x22af941639d241562a1668a2fc78e3e975c982ae456ec29c8c1c872e13a901df"
        });
    });

    describe("getBlockByHash", function () {

        var asserts = function (t, block) {
            assert.property(block, "number");
            assert.property(block, "parentHash");
            assert.property(block, "hash");
            assert.property(block, "nonce");
            assert.property(block, "sha3Uncles");
            assert.property(block, "logsBloom");
            assert.property(block, "transactionsRoot");
            assert.property(block, "stateRoot");
            assert.property(block, "miner");
            assert.property(block, "difficulty");
            assert.property(block, "totalDifficulty");
            assert.property(block, "size");
            assert.property(block, "extraData");
            assert.property(block, "gasLimit");
            assert.property(block, "gasUsed");
            assert.property(block, "timestamp");
            assert.property(block, "transactions");
            assert.property(block, "uncles");
            assert.isAbove(parseInt(block.number), 0);
            assert.isAbove(parseInt(block.hash), 0);
            assert.isAbove(parseInt(block.parentHash), 0);
            assert.isAbove(parseInt(block.nonce), 0);
            assert.isAbove(parseInt(block.sha3Uncles), 0);
            assert.isAbove(parseInt(block.transactionsRoot), 0);
            assert.isAbove(parseInt(block.stateRoot), 0);
            assert.isAbove(parseInt(block.miner), 0);
            assert.isAbove(parseInt(block.difficulty), 0);
            assert.isAbove(parseInt(block.totalDifficulty), 0);
            assert.isAbove(parseInt(block.gasLimit), 0);
            assert.isAbove(parseInt(block.timestamp), 0);
            assert.isAbove(parseInt(block.number), 0);
            assert.isArray(block.transactions);
            assert.isArray(block.uncles);
            assert.strictEqual(parseInt(block.number), parseInt(t.blockNumber));
            assert.strictEqual(block.hash, t.blockHash);
        };

        var test = function (t) {
            it(t.blockHash + " -> " + t.blockNumber, function (done) {
                this.timeout(TIMEOUT);
                rpc.getBlockByHash(t.blockHash, true, function (block) {
                    asserts(t, block);
                    done();
                });
            });
        };

        // network 10101
        test({
            blockHash: "0x9f9954b5da59d78d248c0fcc742e3256c38fce7733c02ae5af3d67d649633e91",
            blockNumber: "0x1"
        });
        test({
            blockHash: "0x0b8cac64fb0f4a9effc4156b6a7a076a0ad842833de7d6280971caadb0a45b44",
            blockNumber: "0x1b4"
        });
        test({
            blockHash: "0x22af941639d241562a1668a2fc78e3e975c982ae456ec29c8c1c872e13a901df",
            blockNumber: "0x24f2"
        });
    });

    describe("invoke", function () {

        var encodedParams = "0x7a66d7ca"+
            "00000000000000000000000000000000000000000000000000000000000f69b5";
        var returns = "number";
        var cashFaucet = {
            to: contracts.faucets,
            from: COINBASE,
            method: "cashFaucet",
            send: false
        };

        it("invoke == call == broadcast", function (done) {
            this.timeout(TIMEOUT);
            rpc.invoke({
                to: contracts.branches,
                from: COINBASE,
                method: "getVotePeriod",
                signature: "i",
                returns: returns,
                params: "0x0f69b5"
            }, function (invokeResult) {
                rpc.call({
                    from: COINBASE,
                    to: contracts.branches,
                    data: encodedParams,
                    returns: returns
                }, function (callResult) {
                    rpc.broadcast({
                        id: ++requests,
                        jsonrpc: "2.0",
                        method: "eth_call",
                        params: [{
                            from: COINBASE,
                            to: contracts.branches,
                            data: encodedParams,
                            returns: returns
                        }]
                    }, function (broadcastResult) {
                        assert.strictEqual(invokeResult, callResult);
                        assert.strictEqual(invokeResult, broadcastResult);
                        done();
                    }); // broadcast
                }); // call
            }); // invoke
        });

        it("cashFaucet -> raw", function () {
            rpc.invoke(cashFaucet, function (res) {
                assert.include([
                    "0x01",
                    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                ], res);
            });
        });

        it("cashFaucet -> number", function () {
            cashFaucet.returns = "number";
            rpc.invoke(cashFaucet, function (res) {
                assert.include(["1", "-1"], res);
            });
        });

        it("getMarkets(1010101) -> hash[]", function (done) {
            rpc.invoke({
                to: contracts.branches,
                from: COINBASE,
                method: "getMarkets",
                signature: "i",
                returns: "hash[]",
                params: 1010101,
                send: false
            }, function (res) {
                if (res.error) return done(res);
                assert.isAbove(res.length, 1);
                assert.strictEqual(res[0].length, 66);
                done();
            });
        });

    });

    describe("errorCodes", function () {

        var test = function (t) {
            it(t.itx.method, function () {
                var actual = rpc.errorCodes(t.itx, t.response);
                assert.strictEqual(actual, t.expected);
            });
        };

        test({
            itx: {
                to: contracts.faucets,
                from: COINBASE,
                method: "reputationFaucet",
                signature: "i",
                params: "0xf69b5",
                returns: "number"
            },
            response: "1",
            expected: "1"
        });


    });

    describe("encodeResult", function () {

        var test = function (t) {
            it(t.result + "," + t.returns + " -> " + t.expected, function () {
                var actual = rpc.encodeResult(t.result, t.returns);
                assert.strictEqual(actual, t.expected);
            });
        };

        test({
            result: "1",
            returns: "number",
            expected: "1"
        });

    });

    describe("fire", function () {

        var test = function (t) {
            it(t.itx.method, function (done) {
                this.timeout(TIMEOUT);
                rpc.fire(t.itx, function (res) {
                    if (res.error) return done(res);
                    assert.strictEqual(res, t.expected);
                    done();
                });
            });
        };

        test({
            itx: {
                to: contracts.faucets,
                from: COINBASE,
                method: "reputationFaucet",
                signature: "i",
                params: "0xf69b5",
                returns: "number"
            },
            expected: "1"
        });

    });

    describe("sendEther", function () {

        var etherValue = "1";
        var recipient = "0x639b41c4d3d399894f2a57894278e1653e7cd24c";

        it("send " + etherValue + " ether to " + recipient, function (done) {
            this.timeout(TIMEOUT);
            rpc.balance(recipient, null, function (startBalance) {
                if (startBalance.error) return done(startBalance);
                startBalance = abi.bignum(startBalance).dividedBy(rpc.ETHER);
                rpc.sendEther({
                    to: recipient,
                    value: etherValue,
                    from: COINBASE,
                    onSent: function (res) {
                        assert.isNotNull(res);
                        assert.property(res, "txHash");
                        assert.property(res, "callReturn");
                        assert.isNotNull(res.txHash);
                        assert.strictEqual(res.txHash.length, 66);
                        assert.isNull(res.callReturn);
                    },
                    onSuccess: function (res) {
                        assert.strictEqual(res.from, COINBASE);
                        assert.strictEqual(res.to, recipient);
                        assert.strictEqual(abi.bignum(res.value).dividedBy(rpc.ETHER).toFixed(), etherValue);
                        rpc.balance(recipient, null, function (finalBalance) {
                            if (finalBalance.error) return done(finalBalance);
                            finalBalance = abi.bignum(finalBalance).dividedBy(rpc.ETHER);
                            assert.strictEqual(finalBalance.sub(startBalance).toFixed(), etherValue);
                            done();
                        });
                    },
                    onFailed: done
                });
            });
        });

    });

});
