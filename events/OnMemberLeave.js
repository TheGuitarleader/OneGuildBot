const Discord = require('discord.js');
const logger = require('kailogs');
const config = require('../config.json');

module.exports = function OnMemberLeave(member, client) {
    var createdDate = new Date(member.joinedAt);
    console.log(createdDate);

    // const embed = new Discord.MessageEmbed()
    // .setColor('E74C3C')
    // .setAuthor(`${member.user.username}#${member.user.discriminator} left the guild`)
    // .addField('Total Users:', member.guild.memberCount.toString(), true)
    // .addField('Member since:', `${createdDate.toString().split(" ").slice(0, 4).join(" ")} (${getActiveDays(member.joinedAt)} days old)`, true)
    // .setFooter("ID: " + member.user.id)

    // if(config.discord.logging != null) {
    //     client.channels.cache.get(config.discord.logging).send({ embeds: [embed] });
    // }

    logger.log(`User '${member.displayName}' (${member.id}) left server. (Joined ${getActiveDays(member.joinedAt)} days ago)`, 'OnMemberLeave');
};

function getActiveDays(date) {
    var createdDate = new Date(date);
    console.log(createdDate);
    var currentDate = new Date(Date.now());
    var diffDays = Math.ceil(Math.abs(currentDate - createdDate) / (1000 * 60 * 60 * 24) -1);
    console.log(diffDays);
    return diffDays;
}