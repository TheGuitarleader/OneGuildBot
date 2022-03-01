const Discord = require('discord.js');
const config = require('../config.json');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');
const logger = require('../extensions/logging');

const addToVips = require('../functions/addToVips.js');

module.exports = function(message, value) {
    var discordID = message.author.id;

    db.serialize(() => {
        db.run(`INSERT OR IGNORE INTO users VALUES("${discordID}", "${message.author.username}", "false", 0, 300, 0)`, (err) => {
            if(err) {
                logger.error(err, "vipProgress");
            }
        });

        db.run(`UPDATE users SET vipProgress = vipProgress + 1, totalMessages = totalMessages + 1 WHERE discordID = "${discordID}"`, function(err) {
            if(err) {
                logger.error(err, "vipProgress");
            }
            else {
                logger.log(`Updated messages count for '${message.author.username}'`, "vipProgress");
            }
        });

        message.guild.members.fetch(message.author.id).then((member) => {
            if(!member.roles.cache.find(r => r.name === "Guild Managers") && !member.roles.cache.find(r => r.name === "Guild Members"))
            {
                db.get(`SELECT * FROM users WHERE discordID = "${discordID}" AND isVIP = "false"`, [], (err, row) => {
                    if(err) {
                        logger.error(err, 'vipProgress');
                    }
                    else if(row != undefined) {
                        if(row.vipProgress >= row.toVIP) {
                            addToVips(member, message.channel, 30);
                        }
                    }
                    else {
                        logger.warn(`Ignoring '${member.displayName}' because they are already a VIP!`, 'vipProgress');
                    }
                });
            }
            else
            {
                logger.warn(`Ignoring '${member.displayName}' because they are either a 'Guild Manager' or 'Guild Member'`, 'vipProgress');
            }
        });
    })
}