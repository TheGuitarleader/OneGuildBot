const Discord = require('discord.js');
const config = require('../config.json');
const request = require('request');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');
const logger = require('kailogs');

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
                var data = JSON.parse(body);
                let streams = data.data;
    
                streams.forEach((stream) => {
                    db.run(`UPDATE twitchAccounts SET status = "online" WHERE twitchID = "${stream.user_id}"`, function(err) {
                        if(err) {
                            logger.error(err, 'checkOfflineUsers');
                        }
                        else {
                            // Forward live notifcations
                            OnNowLive(stream, client);
                        }
                    });
                });
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