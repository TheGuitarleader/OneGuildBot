const Discord = require('discord.js');
const config = require('../config.json');

const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

module.exports = {
    name: "giveaway",
    description: "Pulls a random active user from the database.",
    /**
     * @param {KaiLogs.Logger} logger
     * @param {Discord.Interaction} interaction 
     * @param {Discord.Client} client 
     */
    async execute(logger, interaction, client) {
        if(config.discord.ownerIDs.includes(interaction.member.id)) {
            var members = [];
            db.all(`SELECT * FROM users WHERE vipProgress >= 8 ORDER BY RANDOM()`, (err, data) => {
                if(err){
                    logger.error(err);
                }
                data.forEach((rows) => {
                    members.push(rows);
                });

                getRandomUser(logger, interaction, members);
            });
        }
        else {
            logger.info(`Unauthorized ${this.name} for user '${interaction.member.displayName}' (${interaction.member.id})`);
            interaction.reply({
                content: ":no_entry_sign: **Unauthorized**",
                ephemeral: true
            });
        }
    }
}

function getRndInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
};

function getRandomUser(logger, interaction, array) {
    let user = array[getRndInt(array.length)];

    console.log('Array: ' + user.username);
    if(config.discord.ownerIDs.includes(user.discordID)) {
        getRandomUser(logger, interaction, array);
    }
    else {
        console.log(user);
        interaction.guild.members.fetch(user.discordID).then((member) => {
            const embed = new Discord.MessageEmbed()
            .setColor(member.displayHexColor)
            .setTitle(`${member.displayName}#${member.user.discriminator}`)
            .setThumbnail(member.user.avatarURL())
            .addField(`Messages:`, user.vipProgress.toString(), true)
            .addField(`Total:`, user.totalMessages.toString(), true)
            .setFooter({ text: `ID: ${member.user.id}` });
    
            interaction.reply({
                embeds: [ embed ],
                ephemeral: true
            });
        });
    }
}