const Discord = require('discord.js');
const config = require('../config.json');
const logger = require('../extensions/logging');

module.exports = {
    name: "ping",
    description: "Checks the connection of the bot",
    async execute(interaction, client) {
        interaction.channel.send("Pinging...").then(intr =>{
            var botping = Math.round(interaction.client.ws.ping);
            var ping = intr.createdTimestamp - interaction.createdTimestamp;

            var embed = new Discord.MessageEmbed()
            .setDescription(":hourglass_flowing_sand: " + ping + "ms\n\n:stopwatch: " + botping + "ms")
            .setColor(config.discord.embedHex)
            //.setFooter("Powered By Quentin")
            
            intr.delete();
            interaction.reply({ embeds: [embed] });
            logger.log(`Ping requested. ${ping}ms latency, ${botping}ms API responce time.`, this.name);
      });
    }
}