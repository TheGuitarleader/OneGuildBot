const Discord = require('discord.js');
const config = require('../config.json');
const request = require('request');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');
const HelixAPI = require('simple-helix-api');
const Twitch = new HelixAPI({
    access_token: config.twitch.access_token,
    client_id: config.twitch.client_id,
    redirect_url: "http://localhost"
});

module.exports = function OnNowLive(logger, stream, client) {
    var guild = client.guilds.cache.get(config.discord.guildID);
    db.get(`SELECT * FROM twitchAccounts WHERE twitchID = ?`, [stream.user_id], (err, user) => {
        if(err) {
            logger.error(err);
        }
        else {
            guild.members.fetch(user.discordID).then((member) => {
                displayLiveInfo(logger, stream, member, client.channels.cache.get(user.channelID), client);
            });
        }
    });
}

function displayLiveInfo(logger, stream, member, channel, client) {
    Twitch.users.getByID(stream.user_id).then((user) => {
        const embed = new Discord.MessageEmbed()
        .setColor('#9146FF')
        .setAuthor({ name: user.display_name, iconURL: user.profile_image_url})
        .setTitle(stream.title)
        .setURL(`https://twitch.tv/${stream.user_login}`)
        .addField('Game', stream.game_name, true)
        .setImage(user.profile_image_url)

        if(member.roles.cache.find(r => r.name === "Guild Leaders") || member.roles.cache.find(r => r.name === "Guild Members")) {
            createGuildEvent(logger, member.displayName, stream, client);
            channel.send({
                content: `🌹 **Hey! One of our Guild Members, ${member.displayName} is now LIVE on Twitch! Please go and show some One Guild Support!** 🌹`,
                embeds: [ embed ]
            });
        }
        else if(member.roles.cache.find(r => r.name === "VIP")) {
            createGuildEvent(logger, member.displayName, stream, client);
            channel.send({
                content: `Hey! One of our 🏅 VIP Members, ${member.displayName} is now LIVE on Twitch! Let's show them some One Guild Love!`,
                embeds: [ embed ]
            });
        }
        else {
            channel.send({
                content: `Hey! ${member.displayName} is now LIVE on Twitch! Please show some One Guild Support and Check Them Out!`,
                embeds: [ embed ]
            });
        }

        logger.info(`Forwarding live update from '${stream.user_login}' (${stream.user_id}) to '${channel.name}' (${channel.id}) ->`);
    });
};

function createGuildEvent(logger, name, stream, client) {
    logger.info(`Creating guild event for member: '${name}'`);
    var guild = client.guilds.cache.get(config.discord.guildID);

    var startDate = Date.now() + 10000;
    var endDate = Date.now() + 7200000;

    let description = `Hey everyone, ${name} is live! Please show some One Guild Support!`;
    guild.scheduledEvents.create({
        name: stream.title,
        description: description,
        scheduledStartTime: startDate,
        scheduledEndTime: endDate,
        privacyLevel: 'GUILD_ONLY',
        entityType: 'EXTERNAL',
        entityMetadata: {
            location: `https://twitch.tv/${stream.user_login}`
        }
    }).then((guildEvent) => {
        db.run(`UPDATE twitchAccounts SET eventID = "${guildEvent.id}" WHERE twitchID = "${stream.user_id}"`, function(err) {
            if(err) {
                logger.error(err);
            }
        });
    });
}

function getImageUrl(url) {
    var apiUrl = url;
    apiUrl = apiUrl.replace('{width}', '1280');
    apiUrl = apiUrl.replace('{height}', '720');

    console.log(apiUrl);
    return apiUrl;
};