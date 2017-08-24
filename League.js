var https = require('https');

function League(k) {
	this.key = k;

	this.makeCall = function(request, cb) {
		var url = 'https://na1.api.riotgames.com/lol/' + request + '?api_key=' + this.key;
		console.log('API Request: ' + url);
		var data = "";

		https.get(url, function(res) {
			res.on('data', function(chunk) {
				data += chunk.toString();
			});
			res.on('end', function() {
				try {
					cb(null, JSON.parse(data));
				} catch (err) {
					cb(err);
				}
			});
		});
	}
}

// Get recent games from account ID
League.prototype.getRecent = function(accountId, cb) {
	this.makeCall('match/v3/matchlists/by-account/' + accountId + '/recent', cb);
}

// Get match info from game ID
League.prototype.getGameInfo = function(gameId, cb) {
	this.makeCall('match/v3/matches/' + gameId, cb);
}

// Get summoner info from account ID
League.prototype.getSummoner = function(accountName, cb) {
	this.makeCall('summoner/v3/summoners/by-name/' + accountName, cb);
}

// STATIC DATA

// Retrieves champion list
League.prototype.getChampions = function(cb) {
	this.makeCall('static-data/v3/champions', cb);
}

// Retrieves item list
League.prototype.getItems = function(cb) {
	this.makeCall('static-data/v3/items', cb);
}

module.exports = League;