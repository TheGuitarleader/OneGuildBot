const Discord = require('discord.js');
const config = require('../config.json');

module.exports = function OnMemberJoin(logger, member, client) {
    var createdDate = new Date(member.user.createdAt);
    console.log(createdDate);

    logger.info(`User '${member.displayName}' (${member.user.id}) joined server. (Created ${getActiveDays(member.user.createdAt)} days ago)`);
};

function getActiveDays(date) {
    var createdDate = new Date(date);
    var currentDate = new Date(Date.now());
    var diffDays = Math.ceil(Math.abs(currentDate - createdDate) / (1000 * 60 * 60 * 24) -1);
    return diffDays;
}