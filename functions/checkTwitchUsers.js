const Discord = require('discord.js');
const config = require('../config.json');
const request = require('request');

const OnTwitchLive = require('../events/OnTwitchLive.js');

module.exports = function(logger, client, time) {
    getUsers(client).then((users) => {
        //console.log(users);

        if(users.length > 0 && users != undefined) {
            var format = `https://api.twitch.tv/helix/streams?`;
            users.forEach((user) => {
                format += `user_id=${user.twitch_id}&`
            });
        
            var url = format.slice(0, -1);
            let newTime = time.getTime() + 14400000;

            if(config.debugMode == true) {
                logger.info(`Sending api request ->`);
            }
        
            request.get(url, {
                'headers': {
                    'Client-Id': config.twitch.client_id
                },
                'auth': {
                    'bearer': config.twitch.access_token
                }
            }, (err, res, body) => {
                if (!err && res.statusCode == 200) {
                    var data = JSON.parse(body);
                    let streams = data.data;

                    if(config.debugMode) {
                        console.log({
                            data: data,
                            streams: streams,
                            url: url
                        });
                    }

                    let stream_ids = [];
                    streams.forEach((s) => {
                        stream_ids.push(s.user_id);
                    });

                    client.guilds.fetch(config.discord.guildID).then((guild) => {
                        streams.forEach((stream) => {
                            
                            if(config.debugMode) {
                                //console.log(stream);
                            }

                            client.db.query(`SELECT twitch_id as dummy, twitch_id, twitch_name, channel_id, cooldown, event_id, status, (SELECT user_id FROM members WHERE members.twitch_id = dummy) as user_id FROM twitch_users WHERE twitch_id = ${stream.user_id}`, (err, rows) => {
                                var row = rows[0];

                                //console.log(row);

                                if(config.debugMode) {
                                    logger.debug(`${row.status} == offline && ${time.getTime()} >= ${row.cooldown}`);
                                }

                                if(err) {
                                    logger.error(err);
                                }
                                else if(row.status == "offline" && time.getTime() >= row.cooldown) {
                                    client.db.query(`UPDATE twitch_users SET twitch_name = "${stream.user_name}", status = "online", cooldown = ${newTime} WHERE twitch_id = "${stream.user_id}"`, function(err) {
                                        if(err) {
                                            logger.error(err);
                                        }
                                        else {
                                            // Forward live notifications        
                                            OnTwitchLive(logger, stream, row, client);
                                        }
                                    });
                                }
                                else if(row.status == "online") {
                                    findOfflineStreams(logger, stream_ids, client)

                                    if(row.event_id != null) {
                                        guild.scheduledEvents.fetch(row.event_id).then((guildEvent) => {
                                            if(time.getTime() < guildEvent.scheduledEndTimestamp) {
                                                //console.log(guildEvent);
                                                guildEvent.edit({
                                                    name: formatStreamName(stream.title),
                                                    scheduledEndTimestamp: time.getTime() + 130000
                                                });
                                            }
                                        });
                                    }
                                }
                            });
                        });
                    });
        
                    // streams.forEach((stream) => {

                    // });
                }
                else {
                    logger.warn(`Returned Error: '${err}'`);

                    if(config.debugMode == true) {
                        logger.info(`Sending request -> ${url}`);
                    }
                }
            });
        }
    });
};

const getUsers = (client) => {
    return new Promise((res, rej) => {
        client.db.query(`SELECT * FROM twitch_users`, (err, rows) => {
            if(err) {
                rej(err)
            }

            res(rows);
        });
    })
};

const getOnlineUsers = (client) => {
    return new Promise((res, rej) => {
        client.db.query(`SELECT twitch_id FROM twitch_users WHERE status = "online"`, (err, rows) => {
            if(err) {
                rej(err)
            }

            res(rows);
        });
    })
};


function findOfflineStreams(logger, streamsArray, client) {
    getOnlineUsers(client).then((userArray) => {

        var userArraySize = userArray.length;

        if(config.debugMode) {
            logger.info(`Users online -> ${userArray.length}`);
        }
 
        for(var i = 0; i < userArraySize; i++) {
            if (streamsArray.indexOf(userArray[i].twitch_id) == -1) {
                client.db.query(`SELECT * FROM twitch_users WHERE twitch_id = "${userArray[i].twitch_id}"`, (err, row) => {
                    logger.info(`User ${row.twitchName} is now offline`);
                    if(row.event_id != null) {
                        client.guilds.fetch(config.discord.guildID).then((guild) => {
                            guild.scheduledEvents.fetch(row.event_id).then((guildEvent) => {
                                guildEvent.delete();

                                if(config.debugMode) {
                                    logger.debug(`Deleted guild event '${guildEvent.name}' (${guildEvent.id})`);
                                }
                            })
                        });
                    }
                });
             
                client.db.query(`UPDATE twitch_users SET status = "offline", event_id = null WHERE twitch_id = "${userArray[i].twitch_id}"`, function(err) {
                    if(err) {
                        logger.error(err);
                    }

                    if(config.debugMode) {
                        logger.debug(`Setting user to offline -> ${userArray[i].twitch_id}`);
                    }
                });    
            }
        }
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

function FormatTime(date)
{
    var d = new Date(date);
    var hours = ("0" + d.getHours()).slice(-2);
    var minutes = ("0" + d.getMinutes()).slice(-2);

    let format = `${hours}:${minutes}`;

    return format;
}