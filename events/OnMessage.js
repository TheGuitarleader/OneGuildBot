const Discord = require('discord.js');
const Margo = require('margojs');
const config = require('../config.json');
const calculateActivity = require('../functions/calculateActivity');

/**
 * 
 * @param {Margo.Logger} logger 
 * @param {Discord.Message} message
 * @param {Discord.Client} client 
 */
module.exports = async function OnMessage(logger, message, client) {

    //logger.message(message.channel.name, message.author.username, message.content.replace(/(?:\r\n|\r|\n)/g, " "));
    client.db.query(`INSERT INTO all_messages(sent_at, channel_id, channel_name, user_id, user_name, msg_content) VALUES("${GetTimestamp()}", ${message.channel.id}, "${message.channel.name}", ${message.author.id}, "${message.author.username}", "${message.content}");`, (err) => {
        if(err) {
            console.error(err);
        }
    });

    calculateActivity(logger, message, client).then(score => {
        console.log(`UPDATE members SET activity_score = ${score.activity_score} AND total_messages = ${score.total_messages} WHERE user_id = "${message.author.id}";`);

        client.db.query(`UPDATE members SET activity_score = ${score.activity_score}, total_messages = ${score.total_messages} WHERE user_id = "${message.author.id}";`, (err) => {
            if(err) {
                console.error(err);
            }
        });   
    });
}

function GetTimestamp()
{
    var t = new Date();

    var year = t.getFullYear();
    var month = ("0" + (t.getMonth() + 1)).slice(-2);
    var day = ("0" + t.getDate()).slice(-2);

    var hours = ("0" + t.getHours()).slice(-2);
    var minutes = ("0" + t.getMinutes()).slice(-2);
    var seconds = ("0" + t.getSeconds()).slice(-2);

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}