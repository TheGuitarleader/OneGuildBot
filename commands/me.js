const Discord = require('discord.js');
const config = require('../config.json');
const addToVips = require('../functions/addToVips');
const moment = require('moment');

const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

module.exports = {
    name: "me",
    description: "Gets all data on a you.",
    /**
     * @param {KaiLogs.Logger} logger 
     * @param {Discord.Interaction} interaction 
     * @param {Discord.Client} client 
     */
    async execute(logger, interaction, client) {
        let user = interaction.user;

        const embed = new Discord.MessageEmbed();
        embed.setColor(config.discord.embedHex)
        embed.setTitle(`${user.username}#${user.discriminator}`);
        embed.setDescription(`This is all the data I have on ${user.username}.`)
        embed.setFooter({ text: `ID: ${user.id}` });

        db.serialize(() => {
            db.get(`SELECT * FROM twitchAccounts WHERE discordID = "${user.id}"`, [], (err, row) => {
                console.log(row);
                if(row != null && row != undefined) {
                    embed.addField(':purple_circle: Twitch Account:', `${row.twitchName} (${row.twitchID})`);
                    embed.addField('Status:', row.status);
                    embed.addField('Cooldown:', formatCooldown(row.cooldown));
                }
            });

            db.get(`SELECT * FROM tweetProfiles WHERE discordID = "${user.id}"`, [], (err, row) => {
                console.log(row);
                if(row != null && row != undefined) {
                    embed.addField(':blue_circle: Twitter Account:', `@${row.accountName} (${row.accountID})`);
                }
            });

            db.get(`SELECT * FROM users WHERE discordID = "${user.id}"`, [], (err, row) => {
                console.log(row);
                if(row != null && row != undefined) {
                    embed.addField('VIP:', '`' + row.isVIP + '`')
                    embed.addField('Messages Sent:', formatCommas(row.vipProgress));
                    embed.addField('Total Sent:', `${formatCommas(row.totalMessages)} (${findPercents(row.vipProgress, row.totalMessages)})`);
                }
            });

            db.all(`SELECT amount FROM messageHistory WHERE discordID = "${user.id}"`, (err, rows) => {
                console.log(rows);

                let messages = [];
                rows.forEach(row => {
                    messages.push(row.amount);
                })

                embed.addField('Average Sent:', findAverage(messages).toString());
                interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            });
        });
    }
}

function findAverage(array) {
    console.log(array);

    let total = 0;
    array.forEach((a) => {
        let value = parseInt(a);
        total = total + value;
    });

    return Math.round((total / array.length));
}

function findPercents(part, whole) {
    let quotient = parseInt(part) / parseInt(whole);
    return (quotient * 100).toFixed(1) + "%";
}

function formatCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatCooldown(time) {
    let now = new Date(Date.now());
    if(time == 0) {
        return 'No cooldown';
    }
    else if(time < now) {
        return 'No cooldown';
    }
    else if(time > now) {
        let duration = time - now;
        return moment.utc(duration).format("HH:mm:ss");
    }
}