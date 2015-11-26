var tournamentController = require('../../app/controllers/tournament-controller');
var mongoose = require("mongoose");
var Tournament = mongoose.model("Tournament");

module.exports = function(app) {

    app.route('/home/tournaments/create')
        .get(function(req, res, next) {
            if (!req.session.director) {
                res.redirect("/");
            } else {
                res.render("create", {tournamentd : req.session.director});
            }
        });

    app.route("/home/tournaments/createteam")
        .post(function(req, res, next) {
            if (!req.session.director) {
                res.redirect("/");
            } else {
                var id = req.body["tournament_id"];
                tournamentController.addTeamToTournament(id, req.body, function(err, teams) {
                    if (err) {
                        // DO STUFF
                    } else {
                        res.send(teams);
                    }
                });
            }
        });

    app.route("/home/tournaments/creategame")
        .post(function(req, res, next) {
            if (!req.session.director) {
                res.redirect("/");
            } else {
                var id = req.body["tournament_id_form"];
                tournamentController.addGameToTournament(id, req.body, function(err, games) {
                    if (err) {
                        // DO STUFF
                        res.status(500).send([]);
                    } else {
                        res.status(200).send({game : games, tid : id});
                    }
                });
            }
        });

    app.route("/home/tournaments/games/remove")
        .post(function(req, res, next) {
            if (!req.session.director) {
                res.redirect("/");
            } else {
                var gameid = req.body["gameid_form"];
                var tournamentid = req.body["tournament_idgame"];
                tournamentController.getGameFromTournament(tournamentid, gameid);
                res.status(200).send("Good to go");
            }
        });

    app.route("/home/tournaments/create/submit")
        .post(function(req, res, next) {
            if (!req.session.director) {
                res.redirect("/");
            } else {
                var name = req.body.t_name;
                var location = req.body.t_location;
                var description = req.body.t_description;
                var date = req.body.t_date;
                var questionset = req.body.t_qset;
                console.log("Session email: " + req.session.director.email);
                tournamentController.addTournament(req.session.director.email, name, date, location, description, questionset, function(err) {
                    if (err) {
                        res.redirect("/");
                    } else {
                        res.redirect("/home/tournaments");
                    }
                });
            }
        });

    app.route("/home/tournaments/getplayers")
        .get(function(req, res, next) {
            if (!req.session.director) {
                res.redirect("/");
            } else {
                var id = req.query["tournamentid"];
                var teamname = req.query["teamname"];
                tournamentController.findTeamMembers(id, teamname, function(err, result) {
                    if (err) {
                        // DO STUFF
                        console.log(err);
                        res.status(500).send("Shiiiiiit");
                    } else {
                        res.status(200).send(result);
                    }
                });
            }
        });

    app.get("/home/tournaments/:tid/games/:gid", function(req, res) {
        console.log(req.params);
        tournamentController.findTournamentById(req.params.tid, function(err, result) {
            var game = null;
            if (result) {
                for (var i = 0; i < result.games.length; i++) {
                    if (result.games[i]._id == req.params.gid) {
                        game = result.games[i];
                        i = result.games.length + 1;
                    }
                }
                if (game !== null) {
                    console.log(result.players);
                    var team1Players = [];
                    var team2Players = [];
                    for (var i = 0; i < result.players.length; i++) {
                        console.log(game.team1.team_id + " | " + result.players[i].teamID);
                        if (result.players[i].teamID == game.team1.team_id) {

                            team1Players.push(result.players[i]);
                        } else if (result.players[i].teamID == game.team2.team_id) {
                            team2Players.push(result.players[i]);
                        }
                    }
                    res.render("game-view", {tournamentd : req.session.director, game : game, tournamentName : result.tournament_name,
                        team1Players : team1Players, team2Players : team2Players, tournament : result});
                } else {
                    res.status(404).send("Couldn't find that specific page");
                }
            }
        });
    });

    app.get("/home/tournaments/:tid", function(req, res, next) {
        if (!req.session.director) {
            res.redirect("/");
        } else {
            tournamentController.findTournamentById(req.params.tid, function(err, result) {
                if (err || result == null) {
                    //DO STUFF
                    res.status(200).send("Couldn't find anything");
                } else {
                    res.render("tournament-view", {tournament : result, tournamentd : req.session.director});
                }
            });
        }
    });

    app.get("/home/tournaments", function(req, res, next) {
        if (!req.session.director) {
            res.redirect("/");
        } else {
            tournamentController.findTournamentsByDirector(req.session.director.email, function(err, result) {
                console.log(result);
                if (err || result == null) {
                    // DO STUFF
                    console.log("Result is null");
                    res.render("alltournaments", {tournaments : [], tournamentd : req.session.director});
                } else {
                    res.render("alltournaments", {tournaments : result, tournamentd : req.session.director});
                }
            });
        }
    });

};

/**
* Checks if user is going to specific tournament (in which case the query will be filled)
* or going to all tournaments (in which case query will be empty)
* @return true if empty query, false otherwise
*/
function checkEmptyQuery(query) {
    for (var key in query) {
        if (key) {
            return false;
        }
    }
    return true;
}
