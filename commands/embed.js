const Discord = require('discord.js');
const KaiLogs = require('kailogs');
const config = require('../config.json');

module.exports = {
    name: "embed",
    description: "Sends a embedded message as the bot",
    options: [
        {
          name: 'message',
          type: 3,
          description: 'The message to send in the embed. Use a semicolon (;) to add a line break.',
          required: true,
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
            embed.setDescription(interaction.options.get('message').value.replace(/;/g, '\n'));

            if(interaction.options.get('title') != null && interaction.options.get('title') != undefined) {
                embed.setTitle(interaction.options.get('title').value);
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