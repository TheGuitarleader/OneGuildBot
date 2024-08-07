const Discord = require('discord.js');
const config = require('../config.json');

module.exports = async function(logger, message, client) {
    return new Promise((res, rej) => {
        getMember(client, message.author.id).then(user => {    
            var days = (Date.now() - user.joined_at) / 86400000;
            var msgWeekly = days / 7
            var score = user.total_messages / msgWeekly;
            var daysSince = (Date.now() - user.last_msg) / 86400000;
            var activity = score * 100;
        
            // console.log(user.joined_at);
            // console.log(user.total_messages);
    
            // console.log(days);
            // console.log(msgWeekly);
            // console.log(score);
            // console.log(daysSince);
            // console.log(activity);
    
            // console.log(Math.max(0, Math.round(activity - daysSince)));
    
            res({
                activity_score: Math.max(0, Math.round(activity - daysSince)),
                total_messages: user.total_messages
            });

        }).catch(err => {
            logger.warn(err);
            rej(err);
        });
    });
};

const getMember = (client, user_id) => {
    return new Promise((res, rej) => {
        client.db.query(`SELECT (SELECT COUNT(*) FROM all_messages WHERE user_id = ${user_id}) as total_messages, (SELECT sent_at FROM all_messages WHERE user_id = ${user_id} ORDER BY sent_at ASC LIMIT 1) as joined_at, (SELECT sent_at FROM all_messages WHERE user_id = ${user_id} ORDER BY sent_at DESC LIMIT 1) as last_msg FROM all_messages LIMIT 1;`, (err, row) => {
            if(err) {
                rej(err);
            }
            else {
                res(row[0]);
            }
        });
    })
};