//
var fs = require('fs');
const request = require('request');

const defaultTokens = require('../public/tokens');
var tokensParam = [];

var updateParam = function (tokens) {
    var tokenAddrs = [];
    for (var index in tokens)
        tokenAddrs[index] = tokens[index].address;
    tokensParam[0] = tokenAddrs;
    tokensParam[1] = tokens;
};
updateParam(defaultTokens);

var updateTokens = function () {
    request('https://raw.githubusercontent.com/WONDevelopment/explorer/master/public/tokens.json',
    // request('https://raw.githubusercontent.com/ethereumproject/explorer/master/public/tokens.json',
        { json: true/*, timeout: 15000 */}, (err, res, body) => {
        if (res && res.statusCode === 200) {
            updateParam(body);
            fs.writeFile('./public/tokens.json', JSON.stringify(body, null, 2), 'utf8', function(err) {
                if (err) console.error(err);
            });
        } else {
            if (res)
                console.log('UpdateTokens: ', res.statusCode, res.statusMessage);
            else
                console.error(err);
        }
    });

};

exports.updateTokens = updateTokens;
exports.tokensParam = tokensParam;