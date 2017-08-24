var leagueApi = require('./league.js');
var league = new leagueApi(''); // put your league api token here

const Discord = require('discord.js');
const bot = new Discord.Client();
const token = ''; // put your discord bot token here


var mysql = require('mysql');

var con = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'root',
	database: 'lol',
});

con.connect(function(err) {
	console.log('mysql connected!');
});

/*--------------------------------------------------------------------------------------------------------------------
--																													--
--													DISCORD															--
--																													--
--------------------------------------------------------------------------------------------------------------------*/

bot.on('ready', () => {
	console.log('[discord] logged in on LeagueTrash');
	bot.user.setGame('Master Yi');
});

//event listener for messages
bot.on('message', message => {

});

bot.login(token);

function Embed() {
	this.info = {
		'match': {
			'id': 0,
			'timestamp': 0,
			'length': 0,
			'type': 0
		},
		'player': {
			'name': 'name',
			'champion': 'champion',
			'position': 'role + lane',
			'kda': {
				'k': 0,
				'd': 0,
				'a': 0,
				'ratio': 0
			},
			'cs': {
				'total': 0,
				'pm': 0
			},
			'damage': {
				'dealt': 0,
				'taken': 0
			}
		}
	}
	var parent = this;

	this.set = function(area, field, value, subfield) {
		if (!subfield) {
			parent.info[area][field] = value;
		} else {
			parent.info[area][field][subfield] = value;
		}
		
	}

	this.summoner = function(userId, cb) {
		// get summoner name using user id and callback summoner name
		con.query('SELECT summoner_name FROM user WHERE id = ' + userId, function(err, res) {
			if (res.length > 0) {
				cb(res[0]['summoner_name']);
			} else {
				cb('something went terribly wrong here uwu');
			}
		});
	}

	this.champion = function(champId, cb) {
		// get champion from static data table and return champion name string
		con.query('SELECT c_key FROM static_champion WHERE id = ' + champId, function(err, res) {
			if (res.length > 0) {
				cb(res[0]['c_key']);
			} else {
				cb('something went terribly wrong here uwu');
			}
		});
	}

	
	this.build = function(channel) {
		console.log(parent.info);
		var embed = new Discord.RichEmbed()
			.setTitle('New match found for ' + parent.info.player.name)
			.setDescription('Match ID: ' + parent.info.match.id + '\nCreated on: ' + parent.info.match.timestamp)
			//.setColor([255,64,128])
			.setThumbnail('http://ddragon.leagueoflegends.com/cdn/6.24.1/img/champion/' + parent.info.player.champion + '.png')
			// match details
			.addField('Match length', parent.info.match.length, true)
			.addField('Match type', parent.info.match.type, true)
			// player details
			.addField('Player information', 'Division and ranking information coming soon here!')
			.addField('Position', parent.info.player.champion + '\n' + parent.info.player.position, true)
			.addField('K/D/A', parent.info.player.kda.k + '/' + parent.info.player.kda.d + '/' + parent.info.player.kda.a + '\n(' + parent.info.player.kda.ratio + ')', true)
			.addField('CS', '' + parent.info.player.cs.total + '\n' + (parent.info.player.cs.pm * 10) + ' @10m\n' + parent.info.player.cs.pm + '/m', true)
			.addField('Damage', 'Dealt: ' + parent.info.player.damage.dealt + '\nTaken: ' + parent.info.player.damage.taken, true);

		bot.channels.find('name', channel).send('', { embed: embed });
	}
}

var embed = new Embed();

/*--------------------------------------------------------------------------------------------------------------------
--																													--
--													LEAGUE															--
--																													--
--------------------------------------------------------------------------------------------------------------------*/


function Queue () {
	var queue = [];

	var queueInterval = setInterval(function() {
		if (queue.length > 0) {
			console.log('[queue] match found: ');
			console.log(queue[0][1]);
			embed.summoner(queue[0][0], function(summoner) {
				embed.set('player', 'name', summoner);
			});

			switch(queue[0][2]) {
				case 1:
					insertGame(queue[0][0], queue[0][1]/*data.matches[increment]*/, function(res, id, champion) {
						stat(id, queue[0][1].gameId, champion, function() {
						 	queue.splice(0, 1);
						}, true);
					});
					break;
				case 2:
					insertGame(queue[0][0], queue[0][1]/*data.matches[increment]*/, function(err, id, champion) {
						//console.log(err);
						// function for inserting stats
						stat(id, queue[0][1].gameId, champion, function() {
						 	queue.splice(0, 1);
						}, false);
					});
					break;
				default:
					console.log('[queue] error');
					break;
			}
		} else {
			console.log('[queue] waiting for matches...');
		}
	}, 5000);

	this.queueAdd = function(userId, gameId, recType) {
		queue.push([userId, gameId, recType]);
	}
}

var queue = new Queue();

function scan (userId) {
	console.log('Scanning recent matches for user: ' + userId);
	getAccountId(userId, function(accountId) {
		league.getRecent(accountId, function(err, data) {

			for(var count = (data.matches.length-1); count >= 0; count--) {
				checkIfGameExist(userId, data.matches[count].gameId, count, function(res, increment) {
					switch (res) {
						case 0:
							//console.log('Duplicate match and user.');
							break;
						case 1:
							console.log('[scan] duplicate match, new user');
							// insertGame(userId, data.matches[increment], function(res, id) {
							// 	//console.log(res);
							// });
							queue.queueAdd(userId, data.matches[increment], 1);
							break;
						case 2:
							console.log('[scan] new match');
							// insertGame(userId, data.matches[increment], function(err, id) {
							// 	//console.log(err);
							// 	// function for inserting stats
							// 	stat(id, data.matches[increment].gameId);
							// });
							queue.queueAdd(userId, data.matches[increment], 2);
							break;
						default:
							console.log('[scan] error');
							break;
					}
				});
			};
		});
	});
}

// Loop through users in the database to check for new games
con.query('SELECT id FROM user', function(err, res) {
	if(res.length > 0) {
		var count = 1;
		scan(4);
		var interval = setInterval(function() {
			scan(res[count]['id']);

			count++;
			if(count == res.length) count = 0;
		}, 100000);
	}
});

// // Used for inserting champions into db
// league.getItems(function(err, data) {
// 	data = data.data;
// 	var input = [];
// 	for (var key in data) {
// 		if(data.hasOwnProperty(key)) {
// 			input.push([data[key].id, data[key].name, data[key].description, data[key].plaintext]);
// 		}
// 	}
// 	insert (
// 		'static_item',
// 		'id,name,description,plaintext',
// 		input,
// 		function(champId) {
// 			console.log('done');
// 		}
// 	);
// });

// // Used for inserting champions into db
// league.getChampions(function(err, data) {
// 	data = data.data;
// 	var input = [];
// 	for (var key in data) {
// 		if(data.hasOwnProperty(key)) {
// 			input.push([data[key].id, data[key].key, data[key].name, data[key].title]);
// 		}
// 	}
// 	console.log(input);
// 	insert (
// 		'static_champion',
// 		'id,c_key,name,title',
// 		input,
// 		function(champId) {
// 			console.log('done');
// 		}
// 	);
// });

// Record all stats for all players in a given game.
function stat (gameId, matchId, champion, cb, parentLazy) {

	// use later for advanced game data
	// var input = [[u, d.gameId, d.platformId, d.gameCreation, d.gameDuration, d.queueId, d.mapId, d.seasonId, d.gameVerstion, d.gameMode, d.gameType, d.champion, d.role, d.lane]];
	// var sql = 'INSERT INTO `game` (`user_id`, `game_id`, `platform_id`, `game_creation`, `game_duration`, `queue_id`, `map_id`, `season_id`, `game_version`, `game_mode`, `game_type`, `champion`, `role`, `lane`) VALUES ?';
	league.getGameInfo(matchId, function(err, data) {
		embed.set('match', 'length', data.gameDuration);
		embed.set('match', 'type', data.gameType);
		for (var i = 0; i < data.participants.length; i++) {
			insertAllStats (data.participants[i], i, parentLazy);
		}



		function insertAllStats (p, inc, lazy) {
			if(parentLazy == true) {
			insert (
				'stat',
				'game_id,participant_id,team_id,spell1_id,spell2_id,champion_id,highest_achieved_season_tier,champ_level',
				[[gameId, p.participantId, p.teamId, p.spell1Id, p.spell2Id, p.championId, p.highestAchievedSeasonTier, p.stats.champLevel]],
				function(statId) {
					//console.log('[stat] Row inserted with id: ' + statId);

					// insert cs
					insert (
						'cs',
						'stat_id,total_minions_killed,neutral_minions_killed,neutral_minions_killed_team_jungle,neutral_minions_killed_enemy_jungle,gold_earned,gold_spent',
						[[statId, p.stats.totalMinionsKilled, p.stats.neutralMinionsKilled, p.stats.neutralMinionsKilledTeamJungle, p.stats.neutralMinionsKilledEnemyJungle, p.stats.goldEarned, p.stats.goldSpent]],
						function(csId) {
							//console.log('[cs] Row inserted with id: ' + csId);
						}
					);

					// insert damage
					insert (
						'damage',
						'stat_id,total_damage_dealt,total_damage_dealt_to_champions,total_damage_taken,largest_critical_strike,total_heal,magic_damage_dealt_to_champions,physical_damage_dealt_to_champions,true_damage_dealt_to_champions,magic_damage_dealt,physical_damage_dealt,true_damage_dealt,magical_damage_taken,physical_damage_taken,true_damage_taken,total_units_healed,total_time_crowd_control_dealt',
						[[statId, p.stats.totalDamageDealt, p.stats.totalDamageDealtToChampions, p.stats.totalDamageTaken, p.stats.largestCriticalStrike, p.stats.totalHeal, p.stats.magicDamageDealtToChampions, p.stats.physicalDamageDealtToChampions, p.stats.trueDamageDealtToChampions, p.stats.magicDamageDealt, p.stats.physicalDamageDealt, p.stats.trueDamageDealt, p.stats.magicalDamageTaken, p.stats.physicalDamageTaken, p.stats.trueDamageTaken, p.stats.totalUnitsHealed, p.stats.totalTimeCrowdControlDealt]],
						function(damageId) {
							//console.log('[damage] Row inserted with id: ' + damageId);
						}
					);

					// insert item
					insert (
						'item',
						'stat_id,item0,item1,item2,item3,item4,item5,item6',
						[[statId, p.stats.item0, p.stats.item1, p.stats.item2, p.stats.item3, p.stats.item4, p.stats.item5, p.stats.item6]],
						function(itemId) {
							//console.log('[item] Row inserted with id: ' + itemId);
						}
					);

					// insert kda
					insert (
						'kda',
						'stat_id,kills,deaths,assists,double_kills,triple_kills,quadra_kills,penta_kills,unreal_kills,largest_killing_spree,largest_multi_kill,killing_sprees',
						[[statId, p.stats.kills, p.stats.deaths, p.stats.assists, p.stats.doubleKills, p.stats.tripleKills, p.stats.quadraKills, p.stats.pentaKills, p.stats.unrealKills, p.stats.largestKillingSpree, p.stats.largestMultiKill, p.stats.killingSprees]],
						function(kdaId) {
						}
					);

					// insert objective
					insert (
						'objective',
						'stat_id,first_blood_kill,first_blood_assist,first_tower_kill,first_tower_assist,first_inhibitor_kill,first_inhibitor_assist,inhibitor_kills,tower_kills',
						[[statId, p.stats.firstBloodKill, p.stats.firstBloodAssist, p.stats.firstTowerKill, p.stats.firstTowerAssist, p.stats.firstInhibitorKill, p.stats.firstInhibitorAssist, p.stats.inhibitorKills, p.stats.towerKills]],
						function(objectiveId) {
						}
					);

					// insert score
					insert (
						'score',
						'stat_id,combat_player_score,objective_player_score,total_player_score,total_score_rank',
						[[statId, p.stats.combatPlayerScore, p.stats.objectivePlayerScore, p.stats.totalPlayerScore, p.stats.totalScoreRank]],
						function(scoreId) {
						}
					);

					
					// insert stat deltas
					var typeDelta = ['creepsPerMinDeltas', 'xpPerMinDeltas', 'goldPerMinDeltas', 'csDiffPerMinDeltas', 'xpDiffPerMinDeltas', 'damageTakenPerMinDeltas', 'damageTakenDiffPerMinDeltas'];
					var arrDelta = [];
					arrDelta.push(statId);
					for (var i = 0; i < typeDelta.length; i++) {
						if(p.timeline[typeDelta[i]]) {
							if(p.timeline[typeDelta[i]]['0-10'] > 0) {
								arrDelta.push(p.timeline[typeDelta[i]]['0-10']);
							} else {
								arrDelta.push(0);
							}
						} else {
							arrDelta.push(0);
						}
						
					}
					
					insert (
						'stat_delta',
						'stat_id,creeps_per_min_deltas,xp_per_min_deltas,gold_per_min_deltas,cs_diff_per_min_deltas,xp_diff_per_min_deltas,damage_taken_per_min_deltas,damage_taken_diff_per_min_deltas',
						[arrDelta],
						function(statDeltaId) {

						});

					// insert ward
					insert (
						'ward',
						'stat_id,vision_wards_bought_in_game,sight_wards_bought_in_game,wards_placed,wards_killed',
						[[statId, p.stats.visionWardsBoughtInGame, p.stats.sightWardsBoughtInGame, p.stats.wardsPlaced, p.stats.wardsKilled]],
						function(wardId) {
							if(inc == 9) {
								cb();
							}
						}
					);

					if(p.championId == champion) {
						console.log(p.stats.kills);
						embed.set('player', 'kda', p.stats.kills, 'k');
						embed.set('player', 'kda', p.stats.deaths, 'd');
						embed.set('player', 'kda', p.stats.assists, 'a');
						embed.set('player', 'kda', (p.stats.deaths != 0) ? (p.stats.kills/p.stats.deaths).toFixed(2) : 'Perfect', 'ratio');
						embed.set('player', 'cs', p.stats.totalMinionsKilled + p.stats.neutralMinionsKilled, 'total');
						embed.set('player', 'cs', (p.timeline['creepsPerMinDeltas']['0-10']) ? p.timeline['creepsPerMinDeltas']['0-10'].toFixed(2) : 0, 'pm');
						embed.set('player', 'damage', p.stats.totalDamageDealtToChampions, 'dealt');
						embed.set('player', 'damage', p.stats.totalDamageTaken, 'taken');
						embed.build('leaguetrash');
					}
				}
			);

			}else{
				console.log('stats not recorded');
				if(p.championId == champion) {
					console.log(p.stats.kills);
					embed.set('player', 'kda', p.stats.kills, 'k');
					embed.set('player', 'kda', p.stats.deaths, 'd');
					embed.set('player', 'kda', p.stats.assists, 'a');
					embed.set('player', 'kda', (p.stats.deaths != 0) ? (p.stats.kills/p.stats.deaths).toFixed(2) : 'Perfect', 'ratio');
					embed.set('player', 'cs', p.stats.totalMinionsKilled + p.stats.neutralMinionsKilled, 'total');
					embed.set('player', 'cs', (p.timeline['creepsPerMinDeltas']['0-10']) ? p.timeline['creepsPerMinDeltas']['0-10'].toFixed(2) : 0, 'pm');
					embed.set('player', 'damage', p.stats.totalDamageDealtToChampions, 'dealt');
					embed.set('player', 'damage', p.stats.totalDamageTaken, 'taken');
					embed.build('leaguetrash');

					cb();
				}


			}
		}
	});
}

function insert (d, cf, r, cb) {
	var c = cf.split(',');
	var s = 'INSERT INTO `' + d + '` (';
	for (var i = 0; i < c.length; i++) {
		s += '`' + c[i] + '`';
		if (i < c.length-1) {
			s += ', ';
		}
	}
	s += ') VALUES ?';

	con.query(s, [r], function(err, res) {
		//console.log('[' + d + '] Affected rows: ' + res.affectedRows);
		cb(res.insertId);
	});
}

// Scan functions

// Check if a game record exist and if the user ID is the same
function checkIfGameExist (userId, gameId, increment, cb) {
	con.query('SELECT user_id FROM game WHERE game_id = ' + gameId, function(err, res) {
		if (res.length > 0) {
			var i = 0;
			var flag = false;
			do {
				if (userId == res[i].user_id) {
					// trigger flag if game with new user is found
					flag = true;
				}

				i++;
			} while (i < res.length && !flag)

			(flag) ? cb(0, increment) : cb(1, increment);
			// if (flag) {
			// 	// return 0 if duplicate game and user
			// 	cb(0, increment);
			// } else {
			// 	// return 1 if duplicate game is recorded with different user
			// 	cb(1, increment);
			// }
		} else {
			// Return 2 if game is new
			cb(2, increment);
		}
	});
}

// Insert a row into `game` table
function insertGame (u, d, cb) {
	var input = [[u, d.platformId, d.gameId, d.champion, d.queue, d.season, d.timestamp, d.role, d.lane]];
	var sql = 'INSERT INTO `game` (`user_id`, `platform_id`, `game_id`, `champion`, `queue`, `season`, `timestamp`, `role`, `lane`) VALUES ?';
	con.query(sql, [input], function(err, res) {
		embed.set('match', 'id', d.gameId);
		embed.set('match', 'timestamp', new Date(d.timestamp));
		embed.set('player', 'position', d.role + ' ' + d.lane);
		embed.champion(d.champion, function(champion) {
			embed.set('player', 'champion', champion);
		});
		cb('[game] Affected rows: ' + res.affectedRows, res.insertId, d.champion);
	});
}



// Get account ID from database using user ID
function getAccountId(userId, cb) {
	con.query('SELECT account_id FROM user WHERE id = ' + userId, function(err, res) {
		cb(res[0].account_id);
	});
}