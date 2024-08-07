const Discord = require('discord.js');
const config = require('../config.json');

module.exports = function OnMemberLeave(logger, member, client) {
    var createdDate = new Date(member.joinedAt);
    console.log(createdDate);

    const embed = new Discord.MessageEmbed()
    .setColor('E74C3C')
    .setAuthor(`${member.user.username}#${member.user.discriminator} left the guild`)
    .addField('Total Users:', member.guild.memberCount.toString(), true)
    .addField('Member since:', `${createdDate.toString().split(" ").slice(0, 4).join(" ")} (${getActiveDays(member.joinedAt)} days ago)`, true)
    .setFooter("ID: " + member.user.id)
    client.channels.cache.get(config.discord.private_ch).send({ embeds: [embed] });
    logger.info(`User '${member.displayName}' (${member.user.id}) left server. (Joined ${getActiveDays(member.joinedAt)} days ago) (${member.joinedAt})`);

    db.serialize(() => {
        db.run(`DELETE FROM tweetProfiles WHERE discordID = "${member.user.id}"`, (err) => {
            if(err) {
                logger.error(err);
            }
        });

        db.run(`DELETE FROM twitchAccounts WHERE discordID = "${member.user.id}"`, (err) => {
            if(err) {
                logger.error(err);
            }
        });

        db.run(`DELETE FROM users WHERE discordID = "${member.user.id}"`, (err) => {
            if(err) {
                logger.error(err);
            }
        });

        // db.run(`DELETE FROM messageHistory WHERE discordID = "${member.user.id}"`, (err) => {
        //     if(err) {
        //         logger.error(err);
        //     }
        // });

        db.run(`DELETE FROM diceRollPoints WHERE discordID = "${member.user.id}"`, (err) => {
            if(err) {
                logger.error(err);
            }
        });
    });
};

function getActiveDays(date) {
    var createdDate = new Date(date);
    var currentDate = new Date(Date.now());
    var diffDays = Math.ceil(Math.abs(currentDate - createdDate) / (1000 * 60 * 60 * 24) -1);
    return diffDays;
}