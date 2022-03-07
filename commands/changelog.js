const Discord = require('discord.js');
const fs = require('fs');
const config = require('../config.json');
const package = require('../package.json');

module.exports = {
    name: "changelog",
    description: "Sends a message talking about whats changed",
    group: 'general',
    async execute(logger, interaction, client) {
        var changelog = await readChangelog('./textfiles/changelog.txt');
        
        const embed = new Discord.MessageEmbed()
        .setColor(config.discord.embedHex)
        .setTitle(`What's new with ${client.user.username} v${package.version}?`)
        .setDescription(changelog)

        logger.info(`Showed ${this.name} for user '${interaction.member.displayName}' (${interaction.member.id})`);
        interaction.reply({
            embeds: [ embed ]
        });
    }
}

async function readChangelog(path) {
    return new Promise((res, rej) => {
        fs.readFile(path, 'utf8', function (err, data) {
            if(err){
                rej(err);
            }
            res(data);
        });
    });
}