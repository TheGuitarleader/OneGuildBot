const Discord = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: "nowlive",
    description: "Lists the live accounts",
    group: 'general',
    async execute(logger, interaction, client) {
        client.db.query(`SELECT * FROM twitch_users WHERE status = "online";`, (err, rows) => {

            const embed = new Discord.MessageEmbed();
            embed.setColor('#9146FF');
            embed.setTitle("Currently Live Channels");

            let twitchData = "";
            rows.forEach((row) => {
                twitchData += `${getStatusEmote(row.status)} ${row.twitch_name}\n`;
            });

            embed.setDescription(twitchData);
            interaction.reply({ embeds: [embed] });
            logger.info(`Showed ${this.name} for user '${interaction.member.displayName}' (${interaction.member.id})`);
        });
    }
}

function getStatusEmote(status) {
    if(status == 'offline') {
        let offline = ":white_circle:"
        return offline;
    }
    else if(status == 'online') {
        let online = ":red_circle:"
        return online;
    }
}