const Discord = require('discord.js');
const KaiLogs = require('kailogs');
const config = require('../config.json');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

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
        db.run(`UPDATE diceRollPoints SET points = 0`, function(err) {
            if(err) {
                logger.error(err);
            }
        });

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