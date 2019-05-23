
var fs = require('fs');

/*Start config for node connection and sync*/
var config = {};
var nodeAddr;
//Look for config.json file if not
try {
    var configContents = fs.readFileSync('config.json');
    config = JSON.parse(configContents);

// set the default NODE address to localhost if it's not provided
    if (!('nodeAddr' in config) || !(config.nodeAddr)) {
        config.nodeAddr = 'http://localhost:8545'; // default
    }

    nodeAddr = process.env.NODE_ADDR || config.nodeAddr ;
    console.log('CONFIG FOUND: Node:'+ nodeAddr);
}
catch (error) {
    if (error.code === 'ENOENT') {
        console.log('No config file found. Using default configuration: Node:'+nodeAddr);
    }
    else {
        throw error;
        process.exit(1);
    }
}


var Web3 = require("./lib/won-web3");
var web3;

//Create Web3 connection
if (typeof web3 !== "undefined") {
    web3 = new Web3(web3.currentProvider);
} else {
    web3 = new Web3(new Web3.providers.HttpProvider(nodeAddr));
}

if (web3.isConnected())
    console.log("Web3 connection established");
else
    throw "No connection, please specify web3host in conf.json";


exports.wonWeb3 = web3;
exports.config = config;