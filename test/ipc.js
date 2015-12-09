/**
 * ethrpc unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var join = require("path").join;
var assert = require("chai").assert;
var abi = require("augur-abi");
var geth = require("geth");
var ethrpc = require("../");
var errors = require("../errors");

var COINBASE = "0x05ae1d0ca6206c6168b42efcd1fbe0ed144e821b";

var options = {
    spawn_geth: true,
    symlink: join(process.env.HOME, ".ethereum"),
    flags: {
        networkid: "10101",
        port: 30304,
        rpcport: 8547,
        mine: null,
        unlock: COINBASE,
        etherbase: COINBASE,
        bootnodes: [
            "enode://"+
                "70eb80f63946c2b3f65e68311b4419a80c78271c099a7d1f3d8df8cdd8e37493"+
                "4c795d8bc9f204dda21eb9a318d30197ba7593494eb27ceb52663c8339e9cb70"+
                "@[::]:30303",
            "enode://"+
                "405e781c84b570f02cb2e4ebb18c60528aba5a08ccd72d4ebd7aeabc09208ef2"+
                "4fa54e20ff3b10e478c203dd481f3820242e51fe72770a207a798eadfe8e7e6e"+
                "@[::]:30303",
            "enode://"+
                "d4f4e7fd3954718562544dbf322c0c84d2c87f154dd66a39ea0787a6f74930c4"+
                "2f5d13ba2cfef481b66a6f002bc3915f94964f67251524696a448ba40d1e2b12"+
                "@[::]:30303",
            "enode://"+
                "8f3c33294774dc266446e9c8483fa1a21a49b157d2066717fd52e76d00fb4ed7"+
                "71ad215631f9306db2e5a711884fe436bc0ca082684067836b3b54730a6c3995"+
                "@[::]:30303",
            "enode://"+
                "4f23a991ea8739bcc5ab52625407fcfddb03ac31a36141184cf9072ff8bf3999"+
                "54bb94ec47e1f653a0b0fea8d88a67fa3147dbe5c56067f39e0bd5125ae0d1f1"+
                "@[::]:30303",
            "enode://"+
                "bafc7bbaebf6452dcbf9522a2af30f586b38c72c84922616eacad686ab6aaed2"+
                "b50f808b3f91dba6a546474fe96b5bff97d51c9b062b4a2e8bc9339d9bb8e186"+
                "@[::]:30303"
        ]
    }
};
var contracts = require("augur-contracts")[options.flags.networkid];

describe("IPC", function () {

    var TIMEOUT = 360000;
    var SHA3_INPUT = "boom!";
    var SHA3_DIGEST = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
    var PROTOCOL_VERSION = "63";
    var TXHASH = "0x8807d1cf7bfad194122285cc586ffa72e124e2c47ff6b56067d5193511993c28";
    var requests = 0;

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

    before(function (done) {
        this.timeout(TIMEOUT);
        ethrpc.reset();
        ethrpc.balancer = false;
        ethrpc.ipcpath = join(options.symlink, "geth.ipc");
        if (options.spawn_geth) {
            geth.start(geth.configure(options), function (err, spawned) {
                if (err) return done(err);
                if (!spawned) return done(new Error("where's the geth?"));
                done();
            });
        }
    });

    describe("broadcast", function () {

        var test = function (t) {
            it(JSON.stringify(t.command) + " -> " + t.expected, function (done) {
                this.timeout(TIMEOUT);
                ethrpc.broadcast(t.command, function (res) {
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
                ethrpc.listening(function (listening) {
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
                ethrpc.version(function (version) {
                    if (version.error) return done(version);
                    assert.strictEqual(version, t.version);
                    done();
                });
            });
        };

        test({ version: options.flags.networkid });

    });

    describe("unlocked", function () {

        var test = function (t) {
            it(t.node + " -> " + t.unlocked, function (done) {
                this.timeout(TIMEOUT);
                ethrpc.unlocked(t.account, function (unlocked) {
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

    describe("Ethereum bindings", function () {

        it("raw('eth_coinbase')", function (done) {
            ethrpc.raw("eth_coinbase", null, function (res) {
                if (res.error) return done(res);
                assert.strictEqual(res, COINBASE);
                done();
            });
        });

        it("eth('coinbase')", function (done) {
            ethrpc.eth("coinbase", null, function (res) {
                if (res.error) return done(res);
                assert.strictEqual(res, COINBASE);
                done();
            });
        });

        it("eth('protocolVersion')", function (done) {
            ethrpc.eth("protocolVersion", null, function (res) {
                if (res.error) return done(res);
                assert.strictEqual(res, PROTOCOL_VERSION);
                done();
            });
        });

        it("web3_sha3('" + SHA3_INPUT + "')", function (done) {
            ethrpc.web3("sha3", SHA3_INPUT, function (res) {
                if (res.error) return done(res);
                assert.strictEqual(res, SHA3_DIGEST);
                ethrpc.sha3(SHA3_INPUT, function (res) {
                    if (res.error) return done(res);
                    assert.strictEqual(res, SHA3_DIGEST);
                    done();
                });
            });
        });

        it("leveldb('putString')", function (done) {
            ethrpc.leveldb("putString", [
                "augur_test_DB",
                "testkey",
                "test!"
            ], function (res) {
                if (res.error) return done(res);
                assert.isTrue(res);
                done();
            });
        });

        it("leveldb('getString')", function (done) {
            ethrpc.leveldb("putString", [
                "augur_test_DB",
                "testkey",
                "test!"
            ], function (res) {
                if (res.error) return done(res);
                ethrpc.leveldb(
                    "getString",
                    ["augur_test_DB", "testkey"],
                    function (res) {
                        if (res.error) return done(res);
                        assert.strictEqual(res, "test!");
                        done();
                    }
                );
            });
        });

        it("gasPrice", function (done) {
            ethrpc.gasPrice(function (res) {
                if (res.error) return done(res);
                assert.isAbove(parseInt(res), 0);
                done();
            });
        });

        it("blockNumber", function (done) {
            ethrpc.blockNumber(function (res) {
                if (res.error) return done(res);
                assert.isAbove(parseInt(res), 0);
                done();
            });
        });

        it("balance/getBalance", function (done) {
            ethrpc.balance(COINBASE, function (res) {
                if (res.error) return done(res);
                assert.isAbove(parseInt(res), 0);
                ethrpc.getBalance(COINBASE, function (r) {
                    if (r.error) return done(r);
                    assert.isAbove(parseInt(r), 0);
                    assert.strictEqual(r, res);
                    ethrpc.balance(COINBASE, "latest", function (r) {
                        if (r.error) return done(r);
                        assert.isAbove(parseInt(r), 0);
                        assert.strictEqual(r, res);
                        ethrpc.getBalance(COINBASE, "latest", function (r) {
                            if (r.error) return done(r);
                            assert.isAbove(parseInt(r), 0);
                            assert.strictEqual(r, res);
                            ethrpc.balance(COINBASE, null, function (r) {
                                if (r.error) return done(r);
                                assert.isAbove(parseInt(r), 0);
                                assert.strictEqual(r, res);
                                ethrpc.getBalance(COINBASE, null, function (r) {
                                    if (r.error) return done(r);
                                    assert.isAbove(parseInt(r), 0);
                                    assert.strictEqual(r, res);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("txCount/getTransactionCount", function (done) {
            ethrpc.txCount(COINBASE, function (res) {
                if (res.error) return done(res);
                assert(parseInt(res) >= 0);
                ethrpc.pendingTxCount(COINBASE, function (res) {
                    if (res.error) return done(res);
                    assert(parseInt(res) >= 0);
                    done();
                });
            });
        });

        it("peerCount", function (done) {
            switch (options.flags.networkid) {
            case "10101":
                ethrpc.peerCount(function (res) {
                    if (res.error) return done(res);
                    assert.strictEqual(parseInt(res), 0);
                    done();
                });
                break;
            default:
                ethrpc.peerCount(function (res) {
                    if (res.error) return done(res);
                    assert(parseInt(res) >= 0);
                    done();
                });
            }
        });

        it("hashrate", function (done) {
            ethrpc.hashrate(function (res) {
                if (res.error) return done(res);
                assert(parseInt(res) >= 0);
                done();
            });
        });

        it("mining", function (done) {
            switch (options.flags.networkid) {
            case "10101":
                ethrpc.mining(function (res) {
                    if (res.error) return done(res);
                    assert.isTrue(res);
                    done();
                });
                break;
            default:
                ethrpc.mining(function (res) {
                    if (res.error) return done(res);
                    assert.isBoolean(res);
                    done();
                });
            }
        });

        it("clientVersion", function (done) {
            ethrpc.clientVersion(function (res) {
                if (res.error) return done(res);
                assert.isString(res);
                assert.strictEqual(res.split('/')[0], "Geth");
                done();
            });
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
                ethrpc.getBlock(t.blockNumber, true, function (block) {
                    if (block.error) return done(block);
                    asserts(t, block);
                    done();
                });
            });
        };

        switch (options.flags.networkid) {
        case "10101":
            test({
                blockNumber: "0x1",
                blockHash: "0xfd3a6dcaec75065cefd21b7c2d48294f3239d533ed125de6b7f2bdec1b77f986"
            });
            test({
                blockNumber: "0x1b4",
                blockHash: "0x4221319f188e70d30aa46ee06b6cce9f2d4859d2e2708abaafcb722b93666917"
            });
            break;
        case "7":
            test({
                blockNumber: "0x1",
                blockHash: "0x74aa258b2f71168b97d7d0c72ec8ff501ec15e4e2adc8c663a0f7b01a1025d88"
            });
            test({
                blockNumber: "0x1b4",
                blockHash: "0x721a93982fbbe858aa190476be937ea2052408d7f8ff6fb415cc969aaacaa045"
            });
            break;
        default:
            throw new Error("contracts not on the Frontier main net yet :(");
        }
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
                ethrpc.getBlockByHash(t.blockHash, true, function (block) {
                    asserts(t, block);
                    done();
                });
            });
        };

        switch (options.flags.networkid) {
        case "10101":
            test({
                blockHash: "0xfd3a6dcaec75065cefd21b7c2d48294f3239d533ed125de6b7f2bdec1b77f986",
                blockNumber: "0x1"
            });
            test({
                blockHash: "0x4221319f188e70d30aa46ee06b6cce9f2d4859d2e2708abaafcb722b93666917",
                blockNumber: "0x1b4"
            });
            break;
        case "7":
            test({
                blockHash: "0x74aa258b2f71168b97d7d0c72ec8ff501ec15e4e2adc8c663a0f7b01a1025d88",
                blockNumber: "0x1"
            });
            test({
                blockHash: "0x721a93982fbbe858aa190476be937ea2052408d7f8ff6fb415cc969aaacaa045",
                blockNumber: "0x1b4"
            });
            break;
        default:
            throw new Error("contracts not on the Frontier main net yet :(");
        }
    });

    describe("Calls", function () {

        describe("invoke", function () {
            var encodedParams, returns, cashFaucet;

            before(function () {
                encodedParams = "0x7a66d7ca"+
                "00000000000000000000000000000000000000000000000000000000000f69b5";
                returns = "number";
                cashFaucet = {
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "cashFaucet",
                    send: false
                };
            });

            it("invoke == call == broadcast", function (done) {
                this.timeout(TIMEOUT);
                ethrpc.invoke({
                    to: contracts.branches,
                    from: COINBASE,
                    method: "getVotePeriod",
                    signature: "i",
                    returns: returns,
                    params: "0x0f69b5"
                }, function (invokeResult) {
                    ethrpc.call({
                        from: COINBASE,
                        to: contracts.branches,
                        data: encodedParams,
                        returns: returns
                    }, function (callResult) {
                        ethrpc.broadcast({
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

            it("cashFaucet -> raw", function (done) {
                ethrpc.invoke(cashFaucet, function (res) {
                    assert.include([
                        "0x01",
                        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                    ], res);
                    done();
                });
            });

            it("cashFaucet -> number", function (done) {
                cashFaucet.returns = "number";
                ethrpc.invoke(cashFaucet, function (res) {
                    assert.include(["1", "-1"], res);
                    done();
                });
            });

            it("getMarkets(1010101) -> hash[]", function (done) {
                ethrpc.invoke({
                    to: contracts.branches,
                    from: COINBASE,
                    method: "getMarkets",
                    signature: "i",
                    returns: "hash[]",
                    params: 1010101
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
                    var actual = ethrpc.errorCodes(t.itx, t.response);
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
                    var actual = ethrpc.encodeResult(t.result, t.returns);
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
                    ethrpc.fire(t.itx, function (res) {
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

    });

    describe("Transactions", function () {

        describe("sendEther", function () {

            var etherValue = "1";
            var recipient = "0x639b41c4d3d399894f2a57894278e1653e7cd24c";

            it("send " + etherValue + " ether to " + recipient, function (done) {
                this.timeout(TIMEOUT);
                ethrpc.balance(recipient, null, function (startBalance) {
                    if (!startBalance || startBalance.error) {
                        return done(startBalance);
                    }
                    startBalance = abi.bignum(startBalance).dividedBy(ethrpc.ETHER);
                    ethrpc.sendEther({
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
                            assert.strictEqual(abi.bignum(res.value).dividedBy(ethrpc.ETHER).toFixed(), etherValue);
                            ethrpc.balance(recipient, null, function (finalBalance) {
                                if (!finalBalance || finalBalance.error) {
                                    return done(finalBalance);
                                }
                                finalBalance = abi.bignum(finalBalance).dividedBy(ethrpc.ETHER);
                                assert.strictEqual(finalBalance.sub(startBalance).toFixed(), etherValue);
                                done();
                            });
                        },
                        onFailed: done
                    });
                });
            });

        });

        describe("checkBlockHash", function () {

            var test = function (t) {
                it(t.itx.method, function (done) {
                    this.timeout(TIMEOUT);
                    ethrpc.txs[t.txhash] = {
                        hash: t.txhash,
                        tx: t.tx,
                        count: 0,
                        status: "pending"
                    };
                    ethrpc.checkBlockHash(
                        t.tx,
                        t.callreturn,
                        t.itx,
                        t.txhash,
                        t.returns,
                        function (res) {
                            callbacks.onSent(res);
                            assert.strictEqual(res.callReturn, t.callreturn);
                        },
                        function (res) {
                            callbacks.onSuccess(res);
                            assert.strictEqual(abi.encode(t.itx), res.input);
                            assert.strictEqual(ethrpc.txs[t.txhash].status, "confirmed");
                            assert.strictEqual(ethrpc.txs[t.txhash].count, 1);
                            done();
                        },
                        done
                    );
                });
            };

            test({
                tx: {
                    nonce: "0xf22",
                    blockHash: "0x043d7f980beb3c59b3335d90c4b14794f4577a71ff591c80858fac8a2f99dc39",
                    blockNumber: "0x2f336",
                    transactionIndex: "0x0",
                    from: COINBASE,
                    to: contracts.faucets,
                    value: "0x0",
                    gas: "0x2fd618",
                    gasPrice: "0xba43b7400",
                    input: "0x988445fe00000000000000000000000000000000000000000000000000000000000f69b5",
                    callReturn: "1",
                    hash: TXHASH
                },
                callreturn: "1",
                itx: {
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "reputationFaucet",
                    signature: "i",
                    params: "0xf69b5"
                },
                txhash: TXHASH,
                returns: "number"
            });

        });

        describe("txNotify", function () {

            before(function (done) {
                this.timeout(TIMEOUT);
                ethrpc.TX_POLL_MAX = 64;
                ethrpc.TX_POLL_INTERVAL = 12000;
                var tx = {
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "reputationFaucet",
                    signature: "i",
                    params: "0xf69b5",
                    returns: "number"
                };
                ethrpc.transact(tx,
                    function (res) {
                        callbacks.onSent(res);
                        TXHASH = res.txHash;
                    },
                    function (res) {
                        // console.log("success:", res);
                        callbacks.onSuccess(res);
                        assert.strictEqual(abi.encode(tx), res.input);
                        done();
                    },
                    done
                );
            });

            var test = function (t) {
                it(t.itx.method, function (done) {
                    this.timeout(TIMEOUT);
                    t.txhash = TXHASH;
                    ethrpc.txs[t.txhash] = {
                        hash: t.txhash,
                        tx: t.itx,
                        count: 0,
                        status: "pending"
                    };
                    ethrpc.txNotify(
                        t.callreturn,
                        t.itx,
                        t.txhash,
                        t.returns,
                        function (res) {
                            callbacks.onSent(res);
                            assert.strictEqual(res.callReturn, t.callreturn);
                        },
                        function (res) {
                            callbacks.onSuccess(res);
                            // ethrpc.notifications check
                            assert.strictEqual(abi.encode(t.itx), res.input);
                            assert.strictEqual(ethrpc.txs[t.txhash].status, "confirmed");
                            assert.strictEqual(ethrpc.txs[t.txhash].count, 1);
                            done();
                        },
                        done
                    );
                });
                it("trailing timeout check", function (done) {
                    this.timeout(TIMEOUT);
                    ethrpc.TX_POLL_MAX = 2;
                    ethrpc.TX_POLL_INTERVAL = 1;
                    ethrpc.txs[t.txhash] = {
                        hash: t.txhash,
                        tx: t.itx,
                        count: 0,
                        status: "pending"
                    };
                    ethrpc.txNotify(
                        t.callreturn,
                        t.itx,
                        t.txhash,
                        t.returns,
                        function (res) {
                            callbacks.onSent(res);
                            assert.strictEqual(res.callReturn, t.callreturn);
                        },
                        function (res) {
                            callbacks.onSuccess(res);
                            assert.notProperty(ethrpc.notifications, t.txhash);
                            assert.strictEqual(abi.encode(t.itx), res.input);
                            assert.strictEqual(ethrpc.txs[t.txhash].status, "confirmed");
                            assert.isTrue(false);
                        },
                        function (res) {
                            assert.strictEqual(ethrpc.txs[t.txhash].count, ethrpc.TX_POLL_MAX);
                            assert.strictEqual(ethrpc.txs[t.txhash].status, "unconfirmed");
                            assert.deepEqual(res, errors.TRANSACTION_NOT_CONFIRMED);
                            done();
                        }
                    );
                });
            };

            test({
                callreturn: "1",
                itx: {
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "reputationFaucet",
                    signature: "i",
                    params: "0xf69b5"
                },
                txhash: TXHASH,
                returns: "number"
            });

        });

        describe("confirmTx", function () {

            var test = function (t) {
                it(t.tx.method, function (done) {
                    this.timeout(TIMEOUT);
                    t.txhash = TXHASH;
                    delete ethrpc.txs[t.txhash];
                    ethrpc.confirmTx(
                        t.tx,
                        t.txhash,
                        t.returns,
                        function (res) {
                            callbacks.onSent(res);
                            assert.strictEqual(res.callReturn, t.expected);
                        },
                        function (res) {
                            callbacks.onSuccess(res);
                            assert.strictEqual(abi.encode(t.tx), res.input);
                            done();
                        },
                        done
                    );
                });
            };

            test({
                tx: {
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "reputationFaucet",
                    signature: "i",
                    params: "0xf69b5",
                    returns: "number"
                },
                txhash: TXHASH,
                returns: "number",
                expected: "1"
            });

        });

        describe("transact", function () {

            var test = function (t) {
                it(t.tx.method, function (done) {
                    this.timeout(TIMEOUT);
                    ethrpc.TX_POLL_MAX = 64;
                    ethrpc.TX_POLL_INTERVAL = 12000;
                    ethrpc.transact(
                        t.tx,
                        callbacks.onSent,
                        function (res) {
                            callbacks.onSuccess(res);
                            assert.strictEqual(abi.encode(t.tx), res.input);
                            done();
                        },
                        done
                    );
                });
            };

            test({
                tx: {
                    to: contracts.faucets,
                    from: COINBASE,
                    method: "reputationFaucet",
                    signature: "i",
                    params: "0xf69b5",
                    returns: "number"
                }
            });

        });

    });

});
