const Discord = require('discord.js');
const Margo = require('margojs');
const config = require('../config.json');

module.exports = {
    name: "announce",
    description: "Sends a embed as the bot",
    options: [
        {
          name: 'message',
          type: 3,
          description: 'The message to send in the embed',
        },
        {
            name: 'title',
            type: 3,
            description: 'The title of the embed'
        },
        {
            name: 'author',
            type: 6,
            description: 'The author of the embed'
        },
        {
            name: 'hexcode',
            type: 3,
            description: 'The color of the embed'
        },
    ],
    /**
     * @param {KaiLogs.Logger} logger 
     * @param {Discord.Interaction} interaction 
     * @param {Discord.Client} client 
     */
    async execute(logger, interaction, client) {
        if(config.discord.ownerIDs.includes(interaction.member.id)) {
            const embed = new Discord.MessageEmbed()
            embed.setColor(getColor());

            if(interaction.options.get('title') != null && interaction.options.get('title') != undefined) {
                embed.setTitle(interaction.options.get('title').value);
            }

            if(interaction.options.get('message') != null && interaction.options.get('message') != undefined) {
                embed.setDescription(interaction.options.get('message').value);
            }

            if(interaction.options.get('author') != null && interaction.options.get('author') != undefined) {
                let user = interaction.options.getUser('author');
                embed.setAuthor({ name: user.username, iconURL: user.avatarURL() })
            }

            interaction.channel.send({ embeds: [embed] });
            interaction.reply({
                content: ':white_check_mark: **Sent!**',
                ephemeral: true
            });
        };
    }
}

function getColor(color) {
    if(color != null && color != undefined) {
        return color;
    }
    else {
        return config.discord.embedHex;
    }
}