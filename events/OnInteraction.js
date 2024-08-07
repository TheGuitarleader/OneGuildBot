const Discord = require('discord.js');
const Margo = require('margojs');
const config = require('../config.json');

/**
 * 
 * @param {Margo.Logger} logger 
 * @param {Discord.Interaction} interaction 
 * @param {Discord.Client} client 
 */
module.exports = function OnInteraction(logger, interaction, client) {
    if(interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName.toLowerCase());
        command.execute(logger, interaction, client);
        logger.info(`Ran command: '${command.name}' from '${interaction.member.displayName}'`);
    }
    
    if(interaction.isButton()) {
        logger.info(`Received button: '${interaction.customId}' (${interaction.id}) from '${interaction.member.displayName}'`);
        const guild = interaction.guild;

        // if(interaction.customId == 'trash') {
        //     //logger.warn('Code not added yet!');
            
        //     interaction.message.delete().then(msg => {
        //         interaction.reply({
        //             content: ':thumbsup:',
        //             ephemeral: true
        //         });
        //     });
        // }
    }
}

function getRndInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
};

function formatCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}