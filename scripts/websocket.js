#!/usr/bin/env node

var W3CWebSocket = require("websocket").w3cwebsocket;

var websocket = new W3CWebSocket("ws://127.0.0.1:8546");

websocket.onerror = function () {
  console.log("websocket error :(");
};
websocket.onclose = function () {
  console.log("websocket closed");
};
websocket.onmessage = function (msg) {
  console.log("websocket message:", msg.data);
};
websocket.onopen = function () {
  console.log("websocket open:", websocket.readyState);
  websocket.send(JSON.stringify({"id":1,"jsonrpc":"2.0","method":"eth_gasPrice","params":[]}));
  websocket.send(JSON.stringify({"id":2,"jsonrpc":"2.0","method":"eth_coinbase","params":[]}));
};
