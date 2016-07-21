'use strict';

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcryptjs = require("bcryptjs");
const SALT_WORK_FACTOR = 10;


function toLower(string) {
    return string.toLowerCase();
}

/**
* Schema representing a user of the application. Password and email are saved here.
* Future support for google authentication added
*/
const UserSchema = new Schema({
    local : {
        name : String,
        email : String,
        password : String
    },
    google : {
        id : String,
        token : String,
        email : String,
        name : String
    },
    createdAt : {type : Date, default : Date.now()}
});

UserSchema.methods.generateHash = function(password) {
    return bcryptjs.hashSync(password, bcryptjs.genSalt(10), null);
}

UserSchema.methods.validPassword = function(password) {
    return bcryptjs.compareSync(password, this.local.password);
}

UserSchema.methods.comparePassword = function(testingPassword, cb) {
    bcryptjs.compare(testingPassword, this.password, (err, isMatch) => {
        if (err) {
            return cb(err);
        } else {
            cb(null, isMatch);
        }
    });
}

module.exports = mongoose.model("User", UserSchema);
