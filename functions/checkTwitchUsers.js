const Discord = require('discord.js');
const config = require('../config.json');
const request = require('request');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

const OnTwitchLive = require('../events/OnTwitchLive.js');

module.exports = function(logger, client, time) {
    getUsers().then((users) => {
        if(users.length > 0 && users != undefined) {
            var format = `https://api.twitch.tv/helix/streams?`;
            users.forEach((user) => {
                format += `user_id=${user}&`
            });
        
            var url = format.slice(0, -1);
            let newTime = time.getTime() + 14400000;

            if(config.debugMode == true) {
                logger.info(`Sending request -> ${url}`);
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

                    if(config.debugMode == true) {
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
                            
                            if(config.debugMode == true) {
                                console.log(stream);
                            }

                            db.get(`SELECT * FROM twitchAccounts WHERE twitchID = "${stream.user_id}"`, (err, row) => {
                                if(err) {
                                    logger.error(err);
                                }
                                else if(row.status == "offline" && time.getTime() >= row.cooldown) {
                                    console.log(time.getTime());
                                    console.log(row.cooldown);

                                    guild.members.fetch(row.discordID).then((member) => {
                                        db.run(`UPDATE twitchAccounts SET twitchName = "${stream.user_name}", discordName = "${member.displayName}", status = "online", cooldown = "${newTime}" WHERE twitchID = "${stream.user_id}"`, function(err) {
                                            if(err) {
                                                logger.error(err);
                                            }
                                            else {
                                                // Forward live notifications
                                                logger.info(`User '${stream.user_name}' (${stream.user_id}) is now live.`);
                                                OnTwitchLive(logger, stream, client);
                                            }
                                        });
                                    });
                                }
                                else if(row.status == "online") {
                                    findOfflineStreams(logger, stream_ids, client);
                                    if(row.eventID != null) {
                                        guild.scheduledEvents.fetch(row.eventID).then((guildEvent) => {
                                            if(time.getTime() < guildEvent.scheduledEndTimestamp) {
                                                //console.log(guildEvent);
                                                guildEvent.edit({
                                                    name: formatStreamName(stream.title),
                                                    scheduledEndTimestamp: time.getTime() + 120000
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

const getUsers = () => {
    return new Promise((res, rej) => {
        let result = [];
        db.each(`SELECT * FROM twitchAccounts`, (err, row) => {
            if(err) {
                rej(err)
            }
            result.push(row.twitchID);
        }, () => {
            res(result);
        })
    })
};

const getOnlineUsers = () => {
    return new Promise((res, rej) => {
        let result = [];
        db.each(`SELECT * FROM twitchAccounts WHERE status = "online"`, (err, row) => {
            if(err) {
                rej(err)
            }
            result.push(row.twitchID);
        }, () => {
            res(result);
        })
    })
};


function findOfflineStreams(logger, streamsArray, client) {
    getOnlineUsers().then((userArray) => {
        var userArraySize = userArray.length;

        if(config.debugMode == true) {
            logger.info(`Users online -> ${userArray.length}`);
        }
 
        for(var i = 0; i < userArraySize; i++) {
           if (streamsArray.indexOf(userArray[i]) == -1) {
               db.serialize(() => {
                   db.get(`SELECT * FROM twitchAccounts WHERE twitchID = "${userArray[i]}"`, (err, row) => {
                       logger.info(`User ${row.twitchName} is now offline`);
                       if(row.eventID != null) {
                           client.guilds.fetch(config.discord.guildID).then((guild) => {
                               guild.scheduledEvents.fetch(row.eventID).then((guildEvent) => {
                                   guildEvent.delete();
                               })
                           });

                            if(config.debugMode == true) {
                                console.log(row);
                            }
                       }
                   });
                
                   db.run(`UPDATE twitchAccounts SET status = "offline", eventID = null WHERE twitchID = "${userArray[i]}"`, function(err) {
                       if(err) {
                           logger.error(err);
                       }

                       if(config.debugMode == true) {
                        logger.info(`Setting user to offline -> ${userArray[i]}`);
                       }
                   }); 
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