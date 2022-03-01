const Discord = require('discord.js');
const config = require('../config.json');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');
const logger = require('kailogs');

module.exports = function(member, channel, dateAmount) {
    var date = new Date();
    var expireDate = FormatDate(date, dateAmount);

    console.log(expireDate);

    db.run(`INSERT INTO vips(discordID, username, expireDate) VALUES("${member.user.id}", "${member.displayName}", "${expireDate}")`, function(err) {
        if(err) {
            logger.error(err, "vips");
        }
        else
        {
            logger.log(`Added '${member.displayName}' (${member.user.id}) as a VIP`, 'vips');
            member.roles.add(member.guild.roles.cache.find(r => r.name === "VIP"));

            const embed = new Discord.MessageEmbed()
            .setColor(config.discord.embedHex)
            .setTitle(`:tada: ${member.displayName} is now a **VIP**! :tada:`)
            channel.send({embeds: [embed]});

            db.run(`UPDATE users SET isVIP = "true" WHERE discordID = "${member.user.id}"`, function(err) {
                if(err) {
                    logger.error(err, 'users');
                }
                else
                {
                    logger.log(`Updated '${member.displayName}' (${member.user.id}) to VIP`, 'users');
                }
            });
        }
    });
}

function FormatDate(date, days)
{
    date.setDate(date.getDate() + days)
    var d = new Date(date);
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var year = d.getFullYear();
    return year + '-' + month + '-' + day;
}