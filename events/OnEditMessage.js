const Discord = require('discord.js');
const Margo = require('margojs');
const config = require('../config.json');
const mysql = require('mysql');
const db = mysql.createConnection(config.mysql);

/**
 * 
 * @param {KaiLogs.Logger} logger 
 * @param {Discord.Message} message
 * @param {Discord.Client} client 
 */
module.exports = function OnEditMessage(logger, old_message, new_message, client) {
    db.query(`INSERT INTO edited_messages(sent_at, channel_id, channel_name, user_id, user_name, old_msg_content, new_msg_content) VALUES("${GetTimestamp()}", ${new_message.channel.id}, "${new_message.channel.name}", ${new_message.author.id}, "${new_message.author.username}", "${old_message.content}", "${new_message.content}");`, (err) => {
        if(err) {
            logger.error(err);
        }
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