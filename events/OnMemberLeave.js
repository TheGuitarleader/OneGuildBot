const Discord = require('discord.js');
const config = require('../config.json');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

module.exports = function OnMemberLeave(logger, member, client) {
    var createdDate = new Date(member.joinedAt);
    console.log(createdDate);

    logger.info(`User '${member.displayName}' (${member.user.id}) left server. (Joined ${getActiveDays(member.joinedAt)} days ago)`);

    db.serialize(() => {
        db.run(`DELETE FROM tweetProfiles WHERE discordID = "${member.user.id}"`, (err) => {
            if(err) {
                logger.error(err);
            }
        });

        db.run(`DELETE FROM twitchAccounts WHERE discordID = "${member.user.id}"`, (err) => {
            if(err) {
                logger.error(err);
            }
        });

        db.run(`DELETE FROM users WHERE discordID = "${member.user.id}"`, (err) => {
            if(err) {
                logger.error(err);
            }
        });

        db.run(`DELETE FROM messageHistory WHERE discordID = "${member.user.id}"`, (err) => {
            if(err) {
                logger.error(err);
            }
        });

        db.run(`DELETE FROM diceRollPoints WHERE discordID = "${member.user.id}"`, (err) => {
            if(err) {
                logger.error(err);
            }
        });
    });
};

function getActiveDays(date) {
    var createdDate = new Date(date);
    var currentDate = new Date(Date.now());
    var diffDays = Math.ceil(Math.abs(currentDate - createdDate) / (1000 * 60 * 60 * 24) -1);
    return diffDays;
}