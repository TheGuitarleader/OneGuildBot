const Discord = require('discord.js');
const config = require('../config.json');
const logger = require('kailogs');

const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

module.exports = {
    name: "twitter-list",
    description: "Lists the currently followed accounts",
    group: 'general',
    async execute(interaction, client) {
        db.all(`SELECT * FROM tweetProfiles ORDER BY accountName ASC`, (err, rows) => {

            const embed = new Discord.MessageEmbed();
            embed.setColor(config.discord.embedHex);
            embed.setAuthor(interaction.guild.name, interaction.guild.iconURL())
            embed.setTitle("Currently Following");
            rows.forEach((row) => {
                embed.addField(row.discordName, "@" + row.accountName);
            });
            interaction.reply({ embeds: [embed] });
        });
    }
}