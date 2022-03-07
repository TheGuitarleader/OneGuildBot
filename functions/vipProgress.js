const Discord = require('discord.js');
const config = require('../config.json');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

const addToVips = require('../functions/addToVips.js');

module.exports = function(logger, message, value) {
    db.serialize(() => {
        db.run(`INSERT OR IGNORE INTO users VALUES("${message.author.id}", "${message.author.username}", "false", 0, 300, 0)`, (err) => {
            if(err) {
                logger.error(err);
            }
        });

        db.run(`UPDATE users SET vipProgress = vipProgress + 1, totalMessages = totalMessages + 1 WHERE discordID = "${message.author.id}"`, function(err) {
            if(err) {
                logger.error(err);
            }
            else {
                logger.info(`Updated messages count for '${message.author.username}'`);
            }
        });

        message.guild.members.fetch(message.author.id).then((member) => {
            if(!member.roles.cache.find(r => r.name === "Guild Managers") && !member.roles.cache.find(r => r.name === "Guild Members"))
            {
                db.get(`SELECT * FROM users WHERE discordID = "${message.author.id}" AND isVIP = "false"`, [], (err, row) => {
                    if(err) {
                        logger.error(err);
                    }
                    else if(row != undefined) {
                        if(row.vipProgress >= row.toVIP) {
                            addToVips(member, message.channel, 30);
                        }
                    }
                    else {
                        //logger.warn(`Ignoring '${member.displayName}' because they are already a VIP!`, 'vipProgress');
                    }
                });
            }
            else
            {
                //logger.warn(`Ignoring '${member.displayName}' because they are either a 'Guild Manager' or 'Guild Member'`, 'vipProgress');
            }
        });
    })
}