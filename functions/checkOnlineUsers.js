const Discord = require('discord.js');
const config = require('../config.json');
const request = require('request');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

module.exports = async function(logger) {
    getDBInfo().then((users) => {
        if(users.length > 0 && users != undefined) {
            var format = "https://api.twitch.tv/helix/streams?";
            users.forEach((user) => {
                format += `user_id=${user}&`
            });
        
            var url = format.slice(0, -1);
        
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
                    let streams = [];
                    data.data.forEach((s) => {
                        streams.push(s.user_id);
                    })
    
                    findOfflineStreams(logger, streams, users);
                }
                else {
                    logger.warn(`Returned Error: '${err}'`);
                }
            });
        }
    })
};

const getDBInfo = () => {
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

function findOfflineStreams(logger, streamsArray, userArray) {
    var userArraySize = userArray.length;
 
    for(var i = 0; i < userArraySize; i++) {
       if (streamsArray.indexOf(userArray[i]) == -1) {
           logger.info(`User ${userArray[i]} is now offline`);

           db.serialize(() => {
               db.run(`UPDATE twitchAccounts SET status = "offline" WHERE twitchID = "${userArray[i]}"`, function(err) {
                   if(err) {
                       logger.error(err);
                   }
               });              
           });
       }
    }
 }