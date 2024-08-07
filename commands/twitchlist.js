const Discord = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: "twitch-list",
    description: "Lists the followed Twitch accounts",
    group: 'general',
    async execute(logger, interaction, client) {
        db.all(`SELECT * FROM twitchAccounts ORDER BY twitchName ASC`, (err, rows) => {

            const embed = new Discord.MessageEmbed();
            embed.setColor('#9146FF');
            embed.setTitle("Currently Following");

            let twitchData = "";
            rows.forEach((row) => {
                twitchData += `${getStatusEmote(row.status)} ${row.twitchName}\n`;
            });

            embed.setDescription(twitchData);
            interaction.reply({ embeds: [embed] });
            logger.info(`Showed ${this.name} for user '${interaction.member.displayName}' (${interaction.member.id})`);
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
        let online = ":red_circle:"
        return online;
    }
}