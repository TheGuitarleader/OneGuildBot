const Discord = require('discord.js');
const config = require('../config.json');
const request = require('request');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');
const logger = require('../extensions/logging');

const OnNowLive = require('../events/OnNowLive.js');

module.exports = async function(client) {
    getDBInfo().then((users) => {
        if(users.length > 0 && users != undefined) {
            var format = "https://api.twitch.tv/helix/streams?";
            users.forEach((user) => {
                format += `user_id=${user}&`
            });
        
            var url = format.slice(0, -1)
        
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
        
                    streams.forEach((stream) => {
                        db.run(`UPDATE twitchAccounts SET status = "online" WHERE twitchID = "${stream.user_id}"`, function(err) {
                            if(err) {
                                logger.error(err, 'checkOfflineUsers');
                            }
                            else {
                                // Forward live notifcations
                                logger.logAPI(`User '${stream.user_name}' (${stream.user_id}) is now live.`, 'checkOfflineUsers');
                                OnNowLive(stream, client);
                            }
                        });
                    });
                }
                else {
                    logger.warnAPI(`Returned Error: '${err}' with message: '${res.statusMessage}' (Code: ${res.statusCode})`, 'checkOfflineUsers');
                }
            });
        }
    })
};

const getDBInfo = () => {
    return new Promise((res, rej) => {
        let result = [];
        db.each(`SELECT * FROM twitchAccounts WHERE status = "offline"`, (err, row) => {
            if(err) {
                rej(err)
            }
            result.push(row.twitchID);
        }, () => {
            res(result);
        })
    })
};