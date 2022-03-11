const Discord = require('discord.js');
const KaiLogs = require('kailogs');
const config = require('../config.json');

module.exports = function OnInteraction(logger, interaction, client) {
    if(interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName.toLowerCase());
        command.execute(logger, interaction, client);
        logger.info(`Ran command: '${command.name}' from '${interaction.member.displayName}'`);
    }
    else if(interaction.isButton()) {
        logger.info(`Received button: '${interaction.customId}' (${interaction.id}) from '${interaction.member.displayName}'`);
        const guild = interaction.guild;

        if(interaction.customId == 'trash') {
            logger.warn('Code not added yet!');
        }
        else if(interaction.customId == 'rolldice') {
            let rndInt = formatCommas(getRndInt(6));
            console.log(rndInt);

            const embed = new Discord.MessageEmbed()
            .setColor(config.discord.embedHex)
            .setTitle(`:game_die: ${interaction.member.displayName} rolled a ${rndInt}! :game_die:`)
    
            // const row = new Discord.MessageActionRow()
            // .addComponents(
            //     new Discord.MessageButton()
            //     .setCustomId('trash')
            //     .setStyle('SECONDARY')
            //     .setEmoji('🗑')
            // )
    
            interaction.reply({
                embeds: [embed]
            });
        }
    }
}

function getRndInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
};

function formatCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}