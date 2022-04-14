const Discord = require('discord.js');
const config = require('../config.json');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

const addToVips = require('../functions/addToVips.js');

module.exports = function(logger, message, value) {
    db.serialize(() => {

        // User
        db.run(`INSERT OR IGNORE INTO users VALUES("${message.author.id}", "${message.author.username}", "false", 0, 300, 0)`, (err) => {
            if(err) {
                logger.warn(err);
            }
        });

        db.run(`UPDATE users SET vipProgress = vipProgress + 1, totalMessages = totalMessages + 1 WHERE discordID = "${message.author.id}"`, function(err) {
            if(err) {
                logger.warn(err);
            }
            else {
                //logger.info(`Updated messages count for '${message.author.username}'`);
            }
        });

        message.guild.members.fetch(message.author.id).then((member) => {
            if(message.channel.id != config.discord.live_ch) {
                if(!member.roles.cache.find(r => r.name === "Guild Leaders") && !member.roles.cache.find(r => r.name === "Guild Managers") && !member.roles.cache.find(r => r.name === "Guild Members"))
                {
                    db.get(`SELECT * FROM users WHERE discordID = "${message.author.id}" AND isVIP = "false"`, [], (err, row) => {
                        if(err) {
                            logger.error(err);
                        }
                        else if(row != undefined) {
                            if(row.vipProgress >= row.toVIP) {
                                addToVips(logger, member, message.channel, 30);
                            }
                        }
                        else if(config.debugMode) {
                            logger.debug(`Ignoring '${member.displayName}' because they are already a VIP!`);
                        }
                    });
                }
                else if(config.debugMode) {
                    logger.debug(`Ignoring '${member.displayName}' because they are either a 'Guild Manager' or 'Guild Member'`);
                }
            }
            else if(config.debugMode) {
                logger.debug(`Ignoring message in live channel`);
            }
        });

        // Channel
        db.run(`INSERT OR IGNORE INTO channels VALUES("${message.channel.id}", "${message.channel.name}", 0, 0)`, (err) => {
            if(err) {
                logger.warn(err);
            }
        });

        db.run(`UPDATE channels SET daily = daily + 1, monthly = monthly + 1 WHERE id = "${message.channel.id}"`, function(err) {
            if(err) {
                logger.warn(err);
            }
            else if(config.debugMode) {
                logger.debug('Updated channel count.')
            }
        });
    })
}