var tournamentController = require('../../app/controllers/tournament-controller');
var registrationController = require("../../app/controllers/registration-controller");
var mongoose = require("mongoose");
var Tournament = mongoose.model("Tournament");

module.exports = function(app) {

    app.get("/t", function(req, res, next) {
        res.redirect("/tournaments");
    });

    app.get("/tournaments", function(req, res, next) {
        if (!req.session.director) {
            res.redirect("/");
        } else {
            tournamentController.findTournamentsByDirector(req.session.director._id, function(err, result) {
                if (err || result == null) {
                    // DO STUFF
                    // console.log("Result is null");
                    res.render("alltournaments", {tournaments : [], tournamentd : req.session.director});
                } else {
                    res.render("alltournaments", {tournaments : result, tournamentd : req.session.director});
                }
            });
        }
    });

    app.post("/tournaments/edit", function(req, res, next) {
        // console.log(req.body);
        tournamentController.updateTournamentInformation(req.body.tournamentid, req.body, function(err) {
            if (err) {
                res.status(500).send({err : err});
            } else {
                res.status(200).send({err : null});
            }
        });
    });

    app.route('/create')
        .get(function(req, res, next) {
            if (!req.session.director) {
                res.redirect("/");
            } else {
                res.render("create", {tournamentd : req.session.director});
            }
        });

    app.post("/t/:tid/delete", function(req, res) {
        // console.log(req.params);
        if (!req.session.director) {
            return res.status(401).redirect("/");
        }
        tournamentController.deleteTournament(req.session.director._id, req.params.tid, function(err, status) {
            if (err) {
                console.log(err);
                res.status(500).redirect("/");
            } else if (status == "Unauthorized") {
                res.status(401).redirect("/tournaments");
            } else {
                res.status(200).redirect("/tournaments");
            }
        });
    });

    app.post("/tournaments/newphase", function(req, res) {
        // console.log(req.body);
        if (!req.session.director) {
            return res.status(401).end();
        }
        tournamentController.cloneTournament(req.body.tournamentid, req.body.phaseName, function(err, newTournamentID) {
            if (err) {
                res.status(500).end();
            } else {
                res.status(200).send({newID : newTournamentID});
            }
        });
    });

    app.post("/tournaments/merge", function(req, res) {
        if (!req.session.director) {
            return res.status(401).end();
        }
        // console.log(req.body);
        tournamentController.mergeTournaments(req.body.first, req.body.second, req.body.name, function(err, merged) {
            res.send(merged);
        });
    });

    app.get("/tournaments/findDirectors", function(req, res, next) {
        tournamentController.findDirectors(req.query.collab, function(err, directors) {
            if (err) {
                res.status(500).send({err : err});
            } else {
                res.status(200).send({directors : directors});
            }
        });
    });

    app.post("/tournaments/addCollaborator", function(req, res, next) {
        // console.log(req.body);
        var collaborator = JSON.parse(req.body.collaborators);
        tournamentController.addCollaborator(req.body.tournamentid, collaborator, function(err, duplicate) {
            if (err) {
                res.status(500).send({err : err});
            } else {
                res.status(200).send({duplicate : duplicate, collab : collaborator});
            }
        });
    });

    app.post("/tournaments/removeCollab", function(req, res, next) {
        tournamentController.removeCollaborator(req.body.tournamentid, req.body.collab, function(err) {
            if (err) {
                res.status(500).send({err : err});
            } else {
                res.status(200).send({err : null});
            }
        });
    });

    app.get("/tournaments/findCollaborators", function(req, res, next) {
        // console.log(req.query);
        tournamentController.findCollaborators(req.query.tournamentid, function(err, collaborators) {
            if (err) {
                return res.status(500).send({collabs : []});
            } else {
                // console.log(collaborators);
                return res.status(200).send({collabs : collaborators});
            }
        });
    });

    app.post("/tournaments/editPointSchema", function(req, res, next) {
        // console.log(req.body);
        // console.log(JSON.parse(req.body.pointtypes));
        console.log(req.body);
        var newPointValues = {};
        var newPointTypes = JSON.parse(req.body.pointtypes);
        console.log(newPointTypes);
        var playerNum = 1;
        currentVal = "pointval" + playerNum
        while (req.body[currentVal] != undefined) {
            // console.log(req.body[currentVal]);
            if (req.body[currentVal].length !== 0) {
                newPointValues[req.body[currentVal]] = 0;
            }
            playerNum++;
            currentVal = "pointval" + playerNum;
        }
        // console.log(newPointValues);
        tournamentController.changePointScheme(req.body["tournamentid"], newPointValues, newPointTypes, function(err) {
            if (err) {
                res.status(500).send({err : err});
            } else {
                res.status(200).send({err : null});
            }
        });
    });

    app.post("/tournaments/editDivisions", function(req, res, next) {
        // console.log(req.body);
        var divisions = [];
        var divNum = 1;
        currentDivision = "division" + divNum;
        while (req.body[currentDivision] != undefined) {
            if (req.body[currentDivision].length != 0) {
                divisions.push(req.body[currentDivision]);
            }
            divNum++;
            currentDivision = "division" + divNum;
        }
        tournamentController.updateDivisions(req.body["tournamentid"], divisions, function(err, newDivisions) {
            if (err) {
                res.status(500).end();
            } else {
                res.status(200).send({divisions : newDivisions});
            }
        });
    });

    app.route("/tournaments/createteam")
        .post(function(req, res, next) {
            if (!req.session.director) {
                res.status(401).end();
            } else {
                var id = req.body["tournament_id"];
                tournamentController.addTeamToTournament(id, req.body, function(err, teams, newTeam) {
                    if (err) {
                        res.status(500).end();
                    } else {
                        res.status(200).send({"teams" : teams, "newTeam" : newTeam});
                    }
                });
            }
        });

    app.route("/tournaments/creategame")
        .post(function(req, res, next) {
            if (!req.session.director) {
                res.status(401).send({game : null, tid : id});
            } else {
                var id = req.body["tournament_id_form"];
                tournamentController.addGameToTournament(id, req.body, [], function(err, games) {
                    if (err) {
                        // DO STUFF
                        res.status(500).send({game : null, tid : id});
                    } else {
                        res.status(200).send({game : games, tid : id});
                    }
                });
            }
        });

    app.post("/tournaments/scoresheet/submit", function(req, res) {
        // console.log(req.body);
        if (!req.session.director) {
            res.status(401).end();
        } else {
            tournamentController.addScoresheetAsGame(req.body.tournamentid, req.body.game, req.body.scoresheet, function(err, gameid) {
                if (err) {
                    res.status(500).end();
                } else {
                    res.status(200).send({gameid : gameid});
                }
            });
        }
    });

    app.route("/tournaments/teams/remove")
        .post(function(req, res, next) {
            // console.log(req.body);
            tournamentController.removeTeamFromTournament(req.body["tournament_idteam"], req.body, function(err, teamid) {
                if (err) {
                    console.log(err);
                    res.status(500).end();
                } else {
                    res.status(200).send({"err" : null, "teamid" : teamid});
                }
            });
        });

    app.route("/tournaments/games/remove")
        .post(function(req, res, next) {
            if (!req.session.director) {
                res.redirect("/");
            } else {
                var gameid = req.body["gameid_form"];
                var tournamentid = req.body["tournament_idgame"];
                tournamentController.removeGameFromTournament(tournamentid, gameid, function(err, phases) {
                    if (err) {
                        console.log(err);
                        res.status(500).end();
                    } else {
                        res.status(200).send("Good to go");
                    }
                });
            }
        });

    app.route("/tournaments/players/remove")
        .post(function(req, res, next) {
            // console.log(req.body);
            if (!req.session.director) {
                res.status(401).send({msg : "Hmm, doesn't seem like you're logged in."});
            } else {
                tournamentController.removePlayer(req.body.tournamentidform, req.body.playerid, function(err) {
                    if (err) {
                        res.status(500).send({err : err, msg : "Something went wrong"});
                    } else {
                        res.status(200).send({err : null, msg : "Successfully removed player."});
                    }
                });
            }
        });

    app.route("/tournaments/games/edit")
        .post(function(req, res, next) {
            if (!req.session.director) {
                res.status(401).send({msg : "Unauthorized"});
            } else {
                // console.log(req.body);
                var tournamentid = req.body["tournament_id_form"];
                var gameid = req.body["oldgameid"];
                tournamentController.removeGameFromTournament(tournamentid, gameid, function(err, phases) {
                    if (err) {
                        res.status(500).send({err : err});
                    } else {
                        tournamentController.addGameToTournament(tournamentid, req.body, phases, function(err, game) {
                            if (err) {
                                res.status(500).send({err : err});
                            } else {
                                tournamentController.changeGameShortID(tournamentid, game.shortID, gameid, function(err) {
                                    if (err) {
                                        res.status(500).send({err : err});
                                    } else {
                                        res.status(200).send({err : null});
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });

    app.get("/t/:tid/scoresheet", function(req, res, next) {
        if (!req.session.director) {
            res.redirect("/");
        } else {
            tournamentController.findTournamentById(req.params.tid, function(err, tournament) {
                if (err) {
                    res.status(500).send({err : err});
                } else if (!tournament) {
                    res.status(404).render("not-found", {tournamentd : req.session.director, msg : "That tournament doesn't exist."});
                } else {
                    if (hasPermission(tournament, req.session.director)) {
                        // res.render("scoresheet", {tournamentd : req.session.director, tournament : tournament});
                        res.render("scoresheet", {tournamentd : req.session.director, tournamentName : tournament.tournament_name, tid : tournament._id,
                            shortID : tournament.shortID, teams : tournament.teams});
                    } else {
                        res.status(401).send("You don't have permission to view this tournament");
                    }
                }
            });

        }
    });

    app.route("/tournaments/teams/edit")
        .post(function(req, res, next) {
            if (!req.session.director) {
                res.status(401).end();
            } else {
                var tournamentid = req.body["tournamentid"];
                var teamid = req.body["teamid"];
                tournamentController.updateTeam(tournamentid, teamid, req.body, function(err, team) {
                    if (err) {
                        res.status(500).end();
                        console.log(err);
                    } else if (!team){
                        res.status(200).send({team : null, msg : "A team with that name already exists."});
                    } else {
                        res.status(200).send({team : team, msg : "Successfully updated team."});
                    }
                });
            }
        });

    app.route("/tournaments/players/edit")
        .post(function(req, res, next) {
            if (!req.session.director) {
                res.status(401).end();
            } else {
                // console.log(req.body);
                tournamentController.updatePlayer(req.body.tournamentidform, req.body.playerid, req.body.playername, function(err) {
                    if (err) {
                        res.status(500).end();
                    } else {
                        res.status(200).send({err : null, msg : "Successfully updated player"});
                    }
                });
            }
        });

    app.route("/tournaments/players/create")
        .post(function(req, res, next) {
            // console.log(req.body);
            if (!req.session.director) {
                res.status(401).end();
            } else {
                tournamentController.addPlayer(req.body.tournamentidform, req.body.teamnameform, req.body.teamidform, req.body.newplayername, function(err, player, pointScheme, pointTypes) {
                    if (err) {
                        console.log(err);
                        res.status(500).end();
                    } else {
                        // console.log("Added player");
                        res.status(200).send({err : null, player : player, msg : "Successfully added player", tid : req.body.tournamentidform, pointScheme : pointScheme, pointTypes : pointTypes});
                    }
                });
            }
        });

    app.route("/create/submit")
        .post(function(req, res, next) {
            if (!req.session.director) {
                res.redirect("/");
            } else {
                var name = req.body.t_name;
                var location = req.body.t_location;
                var description = req.body.t_description;
                var date = req.body.t_date;
                var questionset = req.body.t_qset;
                // console.log("Session email: " + req.session.director.email);
                tournamentController.addTournament(req.session.director, name, date, location, description, questionset, function(err) {
                    if (err) {
                        res.redirect("/create");
                    } else {
                        res.redirect("/tournaments");
                    }
                });
            }
        });

    app.route("/tournaments/getplayers")
        .get(function(req, res, next) {
            if (!req.session.director) {
                res.status(401).end();
            } else {
                // console.log(req.query);
                var id = req.query["tournamentid"];
                var teamname = req.query["teamname"];
                tournamentController.findTeamMembers(id, teamname, function(err, players, pointScheme, pointTypes) {
                    if (err) {
                        // DO STUFF
                        console.log(err);
                        res.status(500).end();
                    } else {
                        res.status(200).send({players : players, pointScheme : pointScheme, pointTypes : pointTypes});
                    }
                });
            }
        });

    app.get("/t/:tid/teams/:teamid", function(req, res) {
        // Add check for session here
        if (!req.session.director) {
            return res.redirect("/");
        }
        tournamentController.findTournamentById(req.params.tid, function(err, result) {
            var team = null;
            if (result) {
                if (hasPermission(result, req.session.director)) {
                    for (var i = 0; i < result.teams.length; i++) {
                        if (result.teams[i].shortID == req.params.teamid) {
                            team = result.teams[i];
                            i = result.teams.length + 1;
                        }
                    }
                    if (team !== null) {
                        var teamPlayers = [];
                        for (var i = 0; i < result.players.length; i++) {
                            if (result.players[i].teamID == team._id) {
                                teamPlayers.push(result.players[i]);
                            }
                        }
                        res.render("team-view", {team : team, teamPlayers : teamPlayers, tournament : result, tournamentd : req.session.director});
                    } else {
                        res.status(404).render("not-found", {tournamentd: req.session.director, msg : "Could not find that team."})
                    }
                } else {
                    res.status(401).send("You don't have permission to view this tournament");
                }
            } else {
                res.status(404).render("not-found", {tournamentd : req.session.director, msg : "That tournament doesn't exist."});
            }
        });
    });

    app.get("/t/:tid/games/:gid", function(req, res) {
        // console.log(req.params);
        if (!req.session.director) {
            return res.redirect("/");
        }
        tournamentController.findTournamentById(req.params.tid, function(err, result) {
            var game = null;
            if (result) {
                if (hasPermission(result, req.session.director)) {
                    for (var i = 0; i < result.games.length; i++) {
                        if (result.games[i].shortID == req.params.gid) {
                            game = result.games[i];
                            break;
                        }
                    }
                    if (game !== null) {
                        // console.log(result.players);
                        var team1Players = [];
                        var team2Players = [];
                        for (var i = 0; i < result.players.length; i++) {
                            // console.log(game.team1.team_id + " | " + result.players[i].teamID);
                            if (result.players[i].teamID == game.team1.team_id) {
                                team1Players.push(result.players[i]);
                            } else if (result.players[i].teamID == game.team2.team_id) {
                                team2Players.push(result.players[i]);
                            }
                        }
                        res.render("game-view", {tournamentd : req.session.director, game : game, tournamentName : result.tournament_name,
                            team1Players : team1Players, team2Players : team2Players, tournament : result});
                    } else {
                        res.status(404).render("not-found", {tournamentd: req.session.director, msg : "That game doesn't exist."})
                    }
                } else {
                    res.status(401).send("You don't have permission to view this tournament");
                }
            } else {
                res.status(404).render("not-found", {tournamentd: req.session.director, msg : "That tournament doesn't exist."})
            }
        });
    });

    app.get("/t/:tid", function(req, res, next) {
        if (!req.session.director) {
            res.redirect("/");
        } else {
            tournamentController.findTournamentById(req.params.tid, function(err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result == null) {
                    res.status(404).render("not-found", {tournamentd : req.session.director, msg : "That tournament doesn't exist."});
                } else {
                    if (hasPermission(result, req.session.director)) {
                        registrationController.findRegistrationsByTournament(req.params.tid, function(err, regs) {
                            if (err) {
                                res.status(500).send(err);
                            } else {
                                var linkName = result.tournament_name.replace(" ", "_").toLowerCase();
                                res.render("tournament-view", {tournament : result, tournamentd : req.session.director, registrations : regs, linkName : linkName});
                            }
                        });
                    } else {
                        res.status(401).send("You don't have permission to view this tournament");
                    }
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

function hasPermission(tournament, director) {
    if (!director) {
        return false;
    }
    if (tournament.directorid == director._id) {
        return true;
    }
    for (var i = 0; i < tournament.collaborators.length; i++) {
        if (director._id == tournament.collaborators[i].id) {
            return true;
        }
    }
    return false;
}
