GLOBAL.rpc = require("ethrpc");

rpc.nodes.hosted = [];
rpc.setLocalNode("http://127.0.0.1:8545");
rpc.wsUrl = "ws://127.0.0.1:8546";

GLOBAL.COINBASE = rpc.coinbase();
GLOBAL.NETWORK_ID = rpc.version();
GLOBAL.contracts = require("augur-contracts")[NETWORK_ID];
GLOBAL.payload = {
    inputs: ["branch"],
    method: "reputationFaucet",
    returns: "number",
    send: true,
    signature: ["int256"],
    to: "0x5bf6b43d07e14500b3e4778dd0023867f9ef6859",
    from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
    params: [1010101]
};
GLOBAL.mutablePayload = {
    inputs: [
        "branch",
        "description",
        "expDate",
        "minValue",
        "maxValue",
        "numOutcomes",
        "resolution",
        "tradingFee",
        "tag1",
        "tag2",
        "tag3",
        "makerFees",
        "extraInfo"
    ],
    method: "createSingleEventMarket",
    mutable: true,
    returns: "hash",
    send: true,
    signature: [
        "int256",
        "bytes",
        "int256",
        "int256",
        "int256",
        "int256",
        "bytes",
        "int256",
        "int256",
        "int256",
        "int256",
        "int256",
        "bytes"
    ],
    to: "0xb41980c1f8a21090f2d4ef70753fac790d935462",
    from: "0x7c0d52faab596c08f484e3478aebc6205f3f5d8c",
    params: [
        1010101,
        "Will Joey Krug win this year's semi-annual Augur breakdancing competition?",
        parseInt(new Date().getTime() / 990),
        "0x107ad8f556c6c0000",
        "0x1314fb37062980000",
        2,
        "lmgtfy.com",
        "0x470de4df820000",
        "0x4175677572000000000000000000000000000000000000000000000000000000",
        "0x627265616b64616e636500000000000000000000000000000000000000000000",
        "0x636f6d7065746974696f6e000000000000000000000000000000000000000000",
        "0x6f05b59d3b20000",
        "The semi-annual Augur breakdancing competition is held semi-annually."
    ],
    gasPrice: "0x4a817c800",
    value: "0x78cad1e25d0000"
};

rpc.debug.tx = true;
