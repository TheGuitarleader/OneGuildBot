const Discord = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: "rolldice",
    description: "Starts dice rolling",
    // options: [
    //     {
    //       name: 'sides',
    //       type: 4,
    //       description: 'Sides of the die'
    //     }
    // ],
    /**
     * @param {KaiLogs.Logger} logger 
     * @param {Discord.Interaction} interaction 
     * @param {Discord.Client} client 
     */
    async execute(logger, interaction, client) {

        const embed = new Discord.MessageEmbed()
        .setColor(config.discord.embedHex)
        .setTitle(`${interaction.member.displayName} started a dice game!`)
        .setDescription('Press the dice button to roll a dice a see if you can score the highest!')

        const row = new Discord.MessageActionRow()
        .addComponents(
            new Discord.MessageButton()
            .setCustomId('rolldice')
            .setStyle('SECONDARY')
            .setLabel('Roll dice')
            .setEmoji('🎲')
        )

        interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
}