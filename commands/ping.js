const Discord = require('discord.js');
const config = require('../config.json');
const request = require('request');

module.exports = {
    name: "ping",
    description: "Checks the connection of the bot",
    async execute(logger, interaction, client) {
        interaction.channel.send("Pinging...").then(intr =>{
            request.get({
                url: 'https://api.twitch.tv/helix/streams',
                time: true,
                'headers': {
                    'Client-Id': config.twitch.client_id
                },
                'auth': {
                    'bearer': config.twitch.access_token
                }
            }, (err, twitchRes, body) => {
                if (err) {
                    logger.error(err);
                }

                var botping = Math.round(interaction.client.ws.ping);
                var ping = intr.createdTimestamp - interaction.createdTimestamp;
    
                var embed = new Discord.MessageEmbed()
                .setDescription(`:hourglass_flowing_sand: ${ping}ms\n\n` + 
                `:stopwatch: ${botping}ms\n\n` +
                `:microphone2: ${twitchRes.elapsedTime}ms`)  
                .setColor(config.discord.embedHex)
                
                intr.delete();
                interaction.reply({ embeds: [embed] });
                logger.info(`Ping requested. ${ping}ms latency, ${botping}ms Discord response time, and ${twitchRes.elapsedTime}ms from Twitch.`);
            });
      });
    }
}