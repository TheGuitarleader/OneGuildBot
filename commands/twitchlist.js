const Discord = require('discord.js');
const config = require('../config.json');
const logger = require('../extensions/logging');

const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

module.exports = {
    name: "twitch-list",
    description: "Lists the followed Twitch accounts",
    group: 'general',
    async execute(interaction, client) {
        db.all(`SELECT * FROM twitchAccounts ORDER BY twitchName ASC`, (err, rows) => {

            const embed = new Discord.MessageEmbed();
            embed.setColor('#9146FF');
            embed.setTitle("Currently Following");
            rows.forEach((row) => {
                embed.addField(`${getStatusEmote(row.status)} ${row.twitchName}`, row.discordName);
            });
            interaction.reply({ embeds: [embed] });
        });
    }
}

function getStatusEmote(status) {
    if(status == 'offline')
    {
        let offline = ":white_circle:"
        return offline;
    }
    else if(status == 'online')
    {
        let online = ":green_circle:"
        return online;
    }
}