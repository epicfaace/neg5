var mongoose = require("mongoose");
var shortid = require("shortid");
// var shortid = require("short-mongo-id");

var Tournament = mongoose.model("Tournament");
var TournamentDirector = mongoose.model("TournamentDirector");
var Team = mongoose.model("Team");
var Player = mongoose.model("Player");
var Game = mongoose.model("Game");

/**
* Adds a tournament to the specified td - "tournament director" array of tournaments
* @return true if adding tournament succeesed, false otherwise
*/
function addTournament(directorKey, name, date, location, description, questionset, callback) {
    var tourney = new Tournament({
        director_email : directorKey,
        tournament_name : name,
        location : location,
        date : date,
        description : description,
        questionSet : questionset
    });
    tourney.shortID = shortid.generate();
    tourney.save(function(err) {
        if (err) {
            // console.log("Unable to save tournament");
            callback(err);
        } else {
            callback(null);
        }
    });
}

/**
* Returns a list of the tournaments owned by the given directorKey
* @return list of all the tournmanets with a director_email of directorKey.
* returns an empty list if result is empty
*/
function findTournamentsByDirector(directorKey, callback) {
    var query = Tournament.find({director_email : directorKey}).exec(function(err, result) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    });
}

function findTournamentById(id, callback) {
    var query = Tournament.findOne({shortID : id}).exec(function(err, result) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    });
}

function addTeamToTournament(tournamentid, teaminfo, callback) {
    console.log(teaminfo);
    var currentPlayer = 1;
    var key = "player" + currentPlayer + "_name";
    var newPlayers = [];
    var newteam = new Team({
        team_name : teaminfo["team_name"],
        email : teaminfo["team_email"],
        division : teaminfo["team_division"],
    });
    newteam.shortID = shortid.generate();
    while (teaminfo[key] !== undefined) {
        console.log(teaminfo[key])
        if (teaminfo[key].length !== 0) {
            var newplayer = new Player({
                teamID : newteam._id.toString(),
                player_name : teaminfo[key],
                team_name : teaminfo["players_team"],
            });
            newplayer.shortID = shortid.generate();
            newPlayers.push(newplayer);
        }
        currentPlayer++;
        key = "player" + currentPlayer + "_name";
    }
    var tournament = {_id : tournamentid};
    var updateQuery = {$push: {teams : newteam}};
    var updateQueryPlayers = {$push : {players : {$each : newPlayers}}};
    var options = {safe : true, upsert : true};
    Tournament.update(tournament, updateQuery, options, function(err) { // Add the team
        // console.log("error: " + err);
        if (err) {
            callback(err, null, null);
        } else {
            Tournament.update(tournament, updateQueryPlayers, options, function(err) { // Add all players
                // console.log("error: " + err);
                if (err) {
                    callback(err, null, null);
                } else {
                    Tournament.findOne({_id : tournamentid}).exec(function(err, result) {
                        if (err) {
                            callback(err, null, null);
                        } else {
                            callback(null, result.teams, newteam);
                        }
                    })
                }
            });
        }
    });
}

function findTeamMembers(tournamentid, teamid, callback) {
    var query = Tournament.find({_id : tournamentid}).limit(1).exec(function(err, result) {
        if (err || result.length === 0) {
            callback(err, []);
        } else {
            console.log(result[0].players);
            var playersArr = [];
            for (var i = 0; i < result[0].players.length; i++) {
                if (result[0].players[i].teamID == teamid) {
                    playersArr.push(result[0].players[i]);
                }
            }
            callback(null, playersArr);
        }
    });
}

function addGameToTournament(tournamentid, gameinfo, callback) {
    pointsJSONKeys = Object.keys(JSON.parse(gameinfo["pointValueForm"]));
    console.log(gameinfo);
    var newGame = new Game({
        round : gameinfo["round"],
        tossupsheard : gameinfo["tossupsheard"],
    });
    newGame.shortID = shortid.generate();
    newGame.team1.team_id = gameinfo["leftteamselect"];
    newGame.team1.score = gameinfo["leftteamscore"] == null ? "0" : gameinfo["leftteamscore"];
    newGame.team1.team_name = gameinfo["leftteamname"];
    newGame.team2.team_id = gameinfo["rightteamselect"];
    newGame.team2.score = gameinfo["rightteamscore"] == null ? "0" : gameinfo["rightteamscore"];
    newGame.team2.team_name = gameinfo["rightteamname"];
    var playerNum = 1;
    var playerleft = "player" + playerNum + "_leftid";
    newGame.team1.playerStats = {};
    while (gameinfo[playerleft]) {
        newGame.team1.playerStats[gameinfo[playerleft]] = {
                                                        gp : gameinfo["player" + playerNum + "_leftgp"]
                                                        };

        for (var i = 0; i < pointsJSONKeys.length; i++) {
            var currentVal = pointsJSONKeys[i];
            newGame.team1.playerStats[gameinfo[playerleft]][currentVal] = gameinfo["player" + playerNum + "_left_" + currentVal + "val"];
        }
        playerNum++;
        playerleft = "player" + playerNum + "_leftid";
    }
    playerNum = 1;
    var playerright = "player" + playerNum + "_rightid";
    newGame.team2.playerStats = {};
    while (gameinfo[playerright]) {
        newGame.team2.playerStats[gameinfo[playerright]] = {
                                                        gp : gameinfo["player" + playerNum + "_rightgp"]
                                                          };
        for (var i = 0; i < pointsJSONKeys.length; i++) {
            var currentVal = pointsJSONKeys[i];
            newGame.team2.playerStats[gameinfo[playerright]][currentVal] = gameinfo["player" + playerNum + "_right_" + currentVal + "val"];
        }
        playerNum++;
        playerright = "player" + playerNum + "_rightid";
    }
    var tournament = {_id : tournamentid};
    var updateQuery = {$push: {games : newGame}};
    var options = {safe : true, upsert : true};
    Tournament.update(tournament, updateQuery, options, function(err) {
        if (err) {
            console.log("Something went wrong here");
            callback(err, []);
        } else {
            projectGameToTeams(tournamentid, newGame);
            projectGameToPlayers(tournamentid, newGame);
            callback(null, newGame);
        }
    });
}

/**
* Function that takes the newly added-game to the tournament
* and projects the results to the teams involved
* @param tournamentid the unique id of the tournament the game took place at
* @param game the game to project onto involved teams
* TODO Add support for ties!
*/
function projectGameToTeams(tournamentid, game) {
    var winnerOrder = game.getWinner();
    // First, add information about teams themselves
    if (winnerOrder.length !== 3) {
        Tournament.update({_id : tournamentid ,"teams._id" : winnerOrder[0]},
                            {"$inc" : {"teams.$.wins" : 1}}, function(err) {
                                if (err) {
                                    console.log("Something bad happenned");
                                } else {
                                    Tournament.update({_id : tournamentid, "teams._id" : winnerOrder[1]},
                                    {"$inc" : {"teams.$.losses" : 1}}, function(err) {
                                        if (err) {
                                            console.log("Something bad happened down here");
                                        }
                                    });
                                }
        });
    } else {
        // Handles situation with ties
        Tournament.update({_id : tournamentid ,"teams._id" : winnerOrder[0]},
                            {"$inc" : {"teams.$.ties" : 1}}, function(err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    Tournament.update({_id : tournamentid, "teams._id" : winnerOrder[1]},
                                    {"$inc" : {"teams.$.ties" : 1}}, function(err) {
                                        if (err) {
                                            console.log(err);
                                        }
                                    });
                                }
        });
    }
}

/**
* Projects a game's information about players to their
* respective documents
* @param tournamentid id of the tournament the game is at
* @param game the game whose information will be added
*/
function projectGameToPlayers(tournamentid, game) {
    var team1PlayerIDKeys = Object.keys(game.team1.playerStats);
    console.log(team1PlayerIDKeys);
    for (var i = 0; i < team1PlayerIDKeys.length; i++) {
        // Team on left side
        // console.log(game.team1.playerStats[team1PlayerIDKeys[i]]);
        var tournamentQuery = {_id : tournamentid, "players._id" : team1PlayerIDKeys[i]};
        var currentPlayerValueKeys = Object.keys(game.team1.playerStats[team1PlayerIDKeys[i]]);
        for (var j = 0; j < currentPlayerValueKeys.length; j++) {
            var valueToIncrement;
            if (currentPlayerValueKeys[j] === "gp") {
                valueToIncrement = "players.$.gamesPlayed";
            } else {
                valueToIncrement = "players.$.pointValues." + currentPlayerValueKeys[j];
            }
            var action = {};
            action[valueToIncrement] = game.team1.playerStats[team1PlayerIDKeys[i]][currentPlayerValueKeys[j]];
            var incrementQuery = {"$inc" : action};
            // console.log(incrementQuery);
            // console.log(game.team1.playerStats[team1PlayerIDKeys[i]][currentPlayerValueKeys[j]]);
            Tournament.update(tournamentQuery, incrementQuery, function(err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    }
    var team2PlayerIDKeys = Object.keys(game.team2.playerStats);
    for (var i = 0; i < team2PlayerIDKeys.length; i++) {
        // Sliiiiide to the right
        var tournamentQuery = {_id : tournamentid, "players._id" : team2PlayerIDKeys[i]};
        var currentPlayerValueKeys = Object.keys(game.team2.playerStats[team2PlayerIDKeys[i]]);
        for (var j = 0; j < currentPlayerValueKeys.length; j++) {
            var valueToIncrement;
            if (currentPlayerValueKeys[j] === "gp") {
                valueToIncrement = "players.$.gamesPlayed";
            } else {
                valueToIncrement = "players.$.pointValues." + currentPlayerValueKeys[j];
            }
            var action = {};
            action[valueToIncrement] = game.team2.playerStats[team2PlayerIDKeys[i]][currentPlayerValueKeys[j]];
            var incrementQuery = {"$inc" : action};
            // console.log(incrementQuery);
            // console.log(game.team2.playerStats[team2PlayerIDKeys[i]][currentPlayerValueKeys[j]]);
            Tournament.update(tournamentQuery, incrementQuery, function(err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    }
}

/**
* Function to get a specific game from the tournamentid. The resultant game
* returned from the query is used to remove the game from the players and
* teams involved.
* @param tournamentid id of the tournament the game is associated with
* @param gameid id of the game to retrieve
*/
function getGameFromTournament(tournamentid, gameid, callback) {
    // if get game, then remove game from teams and players, then remove the actual game
    var tournamentQuery = {_id : tournamentid, "games.shortID" : gameid};
    Tournament.findOne(tournamentQuery, function(err, result) {
        console.log("Result: " + result);
        if (err || result == null) {
            // DO STUFF
            callback(err);
        } else {
            console.log("Resultant Game: " + result);
            console.log("Game ShortID: " + gameid);
            for (var i = 0; i < result.games.length; i++) {
                if (result.games[i].shortID == gameid) {
                    console.log("GameID: " + result.games[i].shortID + "| " + gameid)
                    removeGameFromTeam(tournamentid, result.games[i]);
                    removeGameFromPlayers(tournamentid, result.games[i]);
                    removeGameFromTournament(tournamentid, result.games[i]);
                    i = result.games.length + 1;
                    callback(null);
                }
            }
        }
    });
}

function removeGameFromTournament(tournamentid, game) {
    var tournamentQuery = {_id : tournamentid, "games.shortID" : game.shortID};
    var pullQuery = {$pull : {games : {shortID : game.shortID}}};
    console.log(pullQuery);
    Tournament.update(tournamentQuery, pullQuery, function(err) {
        if (err) {
            console.log(err);
        }
    });
}

function removeGameFromTeam(tournamentid, game) {
    var winnerOrder = game.getWinner();
    // First, add information about teams themselves
    if (winnerOrder.length !== 3) {
        Tournament.update({_id : tournamentid ,"teams._id" : winnerOrder[0]},
                            {"$inc" : {"teams.$.wins" : -1}}, function(err) {
                                if (err) {
                                    console.log("Something bad happenned");
                                } else {
                                    Tournament.update({_id : tournamentid, "teams._id" : winnerOrder[1]},
                                    {"$inc" : {"teams.$.losses" : -1}}, function(err) {
                                        if (err) {
                                            console.log("Something bad happened down here");
                                        }
                                    });
                                }
        });
    } else {
        // Handles situation with ties
        Tournament.update({_id : tournamentid ,"teams._id" : winnerOrder[0]},
                            {"$inc" : {"teams.$.ties" : -1}}, function(err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    Tournament.update({_id : tournamentid, "teams._id" : winnerOrder[1]},
                                    {"$inc" : {"teams.$.ties" : -1}}, function(err) {
                                        if (err) {
                                            console.log(err);
                                        }
                                    });
                                }
        });
    }
}

function removeGameFromPlayers(tournamentid, game) {
    var team1PlayerIDKeys = Object.keys(game.team1.playerStats);
    // console.log(team1PlayerIDKeys);
    for (var i = 0; i < team1PlayerIDKeys.length; i++) {
        // Team on left side
        // console.log(game.team1.playerStats[team1PlayerIDKeys[i]]);
        var tournamentQuery = {_id : tournamentid, "players._id" : team1PlayerIDKeys[i]};
        var currentPlayerValueKeys = Object.keys(game.team1.playerStats[team1PlayerIDKeys[i]]);
        for (var j = 0; j < currentPlayerValueKeys.length; j++) {
            var valueToIncrement;
            if (currentPlayerValueKeys[j] === "gp") {
                valueToIncrement = "players.$.gamesPlayed";
            } else {
                valueToIncrement = "players.$.pointValues." + currentPlayerValueKeys[j];
            }
            var action = {};
            action[valueToIncrement] = -1 * game.team1.playerStats[team1PlayerIDKeys[i]][currentPlayerValueKeys[j]];
            var incrementQuery = {"$inc" : action};
            console.log(incrementQuery);
            // console.log(game.team1.playerStats[team1PlayerIDKeys[i]][currentPlayerValueKeys[j]]);
            Tournament.update(tournamentQuery, incrementQuery, function(err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    }
    var team2PlayerIDKeys = Object.keys(game.team2.playerStats);
    for (var i = 0; i < team2PlayerIDKeys.length; i++) {
        // Sliiiiide to the right
        var tournamentQuery = {_id : tournamentid, "players._id" : team2PlayerIDKeys[i]};
        var currentPlayerValueKeys = Object.keys(game.team2.playerStats[team2PlayerIDKeys[i]]);
        for (var j = 0; j < currentPlayerValueKeys.length; j++) {
            var valueToIncrement;
            if (currentPlayerValueKeys[j] === "gp") {
                valueToIncrement = "players.$.gamesPlayed";
            } else {
                valueToIncrement = "players.$.pointValues." + currentPlayerValueKeys[j];
            }
            var action = {};
            action[valueToIncrement] = -1 * game.team2.playerStats[team2PlayerIDKeys[i]][currentPlayerValueKeys[j]];
            var incrementQuery = {"$inc" : action};
            console.log(incrementQuery);
            // console.log(game.team2.playerStats[team2PlayerIDKeys[i]][currentPlayerValueKeys[j]]);
            Tournament.update(tournamentQuery, incrementQuery, function(err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    }
}

/**
* Will remove a team from the tournament given the tournament's ID and a
* javascript object with information about the tournament and team short ID. The callback is
* called back with null if no errors arise after deleting the team and players, or with the err
* if something goes wrong or if the team cannot be found. removeTeamFromTournament works by first
* retrieving the team._id and then pulling out the players with that teamID and then removing the team
* @param tournamentid unique ObjectId of the tournament
* @param teaminfo Javascript object holding information about the team and tournament
* @param callback callback function called back after function is done
*/
function removeTeamFromTournament(tournamentid, teaminfo, callback) {
    console.log(teaminfo);
    var tournamentQuery = {_id : tournamentid, "teams.shortID" : teaminfo.teamid_form};
    console.log(tournamentQuery);
    Tournament.findOne(tournamentQuery, function(err, result) {
        if (err || result == null) {
            callback(err);
        } else {
            var teamid = -1;
            for (var i = 0; i < result.teams.length; i++) {
                if (result.teams[i].shortID === teaminfo.teamid_form) {
                    console.log("Short ids match");
                    teamid = result.teams[i]._id.toString();
                    console.log(teamid);
                    i = result.teams.length + 1;
                }
            }
            if (teamid === -1) {
                callback(err);
            } else {
                Tournament.update({_id : tournamentid}, {$pull : {players : {teamID : teamid}}}, function(err) {
                    if (err) {
                        console.log(err);
                        callback(err);
                    } else {
                        Tournament.update({_id : tournamentid}, {$pull : {teams : {_id : teamid}}}, function(err) {
                            if (err) {
                                console.log(err);
                                callback(err);
                            } else {
                                callback(null);
                            }
                        });
                    }
                });
            }
        }
    });
}

function updateTeam(tournamentid, teamid, newinfo, callback) {
    console.log(newinfo);
    Tournament.findOne({_id : tournamentid}, function(err, result) {
        if (err || result == null) {
            console.log(err);
            callback(err, null);
        } else {
            result.teams.forEach(function(team, index, array) {
                if (team.team_name === newinfo.team_name && team._id != newinfo.teamid) {
                    // console.log("Match found");
                    return callback(null, null);
                }
            });
            // console.log("Past first stage");
            Tournament.update({_id : tournamentid, "teams._id" : newinfo.teamid},
                        {"$set" : {"teams.$.team_name" : newinfo.team_name, "teams.$.email" : newinfo.team_email, "teams.$.division" : newinfo.divisionform}},
                    function(err) {
                        if (err) {
                            console.log(err);
                            callback(err, null);
                        } else {
                            // console.log("Past 2nd stage");
                            // console.log(newinfo.teamid);
                            result.players.forEach(function(player, index, array) {
                                if (player.teamID == newinfo.teamid) {
                                    // console.log(player.player_name + "|" + player.teamID + "|" + player._id);
                                    Tournament.update({_id : tournamentid, "players._id" : player._id},
                                            {"$set" : {"players.$.team_name" : newinfo.team_name}},
                                            function(err) {
                                                if (err) {
                                                    console.log(err);
                                                    return callback(err, null);
                                                }
                                            });
                                }
                            });
                            callback(null, null);
                        }
                    });
        }
    });
}

exports.addTournament = addTournament;
exports.findTournamentsByDirector = findTournamentsByDirector;
exports.findTournamentById = findTournamentById;
exports.addTeamToTournament = addTeamToTournament;
exports.findTeamMembers = findTeamMembers;
exports.addGameToTournament = addGameToTournament;
exports.getGameFromTournament = getGameFromTournament;
exports.removeTeamFromTournament = removeTeamFromTournament;
exports.updateTeam = updateTeam;
