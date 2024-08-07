const Discord = require('discord.js');
const config = require('../config.json');
const request = require('request');

const HelixAPI = require('simple-helix-api');
const Twitch = new HelixAPI({
    access_token: config.twitch.access_token,
    client_id: config.twitch.client_id,
    redirect_url: "http://localhost"
});

module.exports = function OnTwitchLive(logger, stream, db, client) {
    logger.info(`User '${stream.user_name}' (${stream.user_id}) is now live.`);

    var guild = client.guilds.cache.get(config.discord.guildID);
    guild.members.fetch(db.user_id).then((member) => {
        if(member.roles.cache.find(r => r.id === "1114462293208612926")) {
            displayLiveInfo(logger, stream, member, client.channels.cache.get(db.channel_id), client);
        }
        else if(config.debugMode) {
            logger.info(`Skipping '${stream.user_name}' (${stream.user_id}) as they do not have a high enough score.`);
        }
    });
}

function displayLiveInfo(logger, stream, member, channel, client) {
    Twitch.users.getByID(stream.user_id).then((user) => {
        const embed = new Discord.MessageEmbed()
        embed.setColor('#9146FF')
        embed.setAuthor({ name: user.display_name, iconURL: user.profile_image_url})
        embed.setTitle(stream.title)
        embed.setURL(`https://twitch.tv/${stream.user_login}`)
        embed.setImage(user.profile_image_url)

        if(stream.game_name != null && stream.game_name != undefined) {
            embed.addField('Game', stream.game_name.toString(), true)
        }

        if(member.roles.cache.find(r => r.name === "Guild Leaders") || member.roles.cache.find(r => r.name === "Guild Members") || member.roles.cache.find(r => r.name === "Guild Managers")) {
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

        if(member.roles.cache.find(r => r.id === "1033113741358796951")) {
            client.channels.fetch(config.discord.gen_ch).then(chnl => {
                chnl.send({
                    content: `Please go catch ${member.displayName}'s stream over on Twitch! They're in our Creator Spotlight!`,
                    embeds: [ embed ]
                });  
            });          
        }
    });
};

function createGuildEvent(logger, name, stream, client) {
    logger.info(`Creating guild event for member: '${name}'`);
    var guild = client.guilds.cache.get(config.discord.guildID);

    var startDate = Date.now() + 10000;
    var endDate = Date.now() + 7200000;

    let description = `Hey everyone, ${name} is live! Please show some One Guild Support!`;
    guild.scheduledEvents.create({
        name: formatStreamName(stream.title),
        description: description,
        scheduledStartTime: startDate,
        scheduledEndTime: endDate,
        privacyLevel: 'GUILD_ONLY',
        entityType: 'EXTERNAL',
        entityMetadata: {
            location: `https://twitch.tv/${stream.user_login}`
        }
    }).then((guildEvent) => {
        client.db.run(`UPDATE twitchAccounts SET eventID = "${guildEvent.id}" WHERE twitchID = "${stream.user_id}"`, function(err) {
            if(err) {
                logger.error(err);
            }
        });
    });
}

function formatStreamName(title) {
    if(title.length > 96) {
        let newTitle = title.substring(0, 96);
        newTitle += "...";
        return newTitle;
    }
    else {
        return title;
    }
}

function getImageUrl(url) {
    var apiUrl = url;
    apiUrl = apiUrl.replace('{width}', '1280');
    apiUrl = apiUrl.replace('{height}', '720');

    console.log(apiUrl);
    return apiUrl;
};