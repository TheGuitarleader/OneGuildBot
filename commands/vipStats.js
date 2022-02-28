const Discord = require('discord.js');
const config = require('../config.json');
const logger = require('kailogs');

const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

module.exports = {
    name: "stats",
    description: "List of top 10 messages sent",
    async execute(interaction, client) {
        db.all(`SELECT * FROM users ORDER BY totalMessages DESC LIMIT 10`, (err, rows) => {
            if(rows != undefined) {
                var totalMessages = 0;

                const embed = new Discord.MessageEmbed();
                embed.setColor(config.discord.embedHex);
                embed.setTitle(":tada: Leaderboard");
                rows.forEach((row) => {
                    embed.addField(row.username, `${formatCommas(row.vipProgress)} messages this month, ${formatCommas(row.totalMessages)} total`);
                    totalMessages = totalMessages + row.totalMessages;
                });
                
                embed.setFooter({ text: `Total sent messages: ${formatCommas(totalMessages)}` });
                interaction.reply({ embeds: [embed] });
            }
        });
    }
}

function formatCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}