const fs = require('fs');
const Discord = require('discord.js');
const Client = require('./client/client.js');
const Twit = require('twit');
const config = require('./config.json');
const package = require('./package.json');
const clock = require('date-events')();
const moment = require('moment');
const HelixAPI = require('simple-helix-api');
const request = require('request');

// Functions
const vip = require('./functions/vipProgress.js');
const addToVips = require('./functions/addToVips.js');
const checkOfflineUsers = require('./functions/checkOfflineUsers.js');
const checkOnlineUsers = require('./functions/checkOnlineUsers.js');

// Functions
const vip = require('./functions/vipProgress.js');
const addToVips = require('./functions/addToVips.js');

// Events
const OnMemberJoin = require('./events/OnMemberJoin');
const OnMemberLeave = require('./events/OnMemberLeave');
const OnNewTweet = require('./events/OnNewTweet');

const discordClient = new Client();
discordClient.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

for(const file of commandFiles) {
    const command = require(`./commands/${file}`);
    discordClient.commands.set(command.name, command);
}

//
// Logging
//
const KaiLogs = require('kailogs');
const logger = new KaiLogs.logger('./logs');
new KaiLogs.exceptions(logger).handle();
new KaiLogs.rejections(logger).handle();
logger.info(`${package.name} v${package.version}`, 'app');

logger.on('error', function(err) {
    discordClient.users.fetch('190612480958005248').then(user => {
        user.send('```js' + err + '```').then(msg => {
            process.exit();
        })
    })
});

// Saves the log at 11:59pm
clock.on('23:59', function (date) {
    logger.save();
});

// discordClient.on('debug', debug => {
//     logger.log(debug, 'DEBUG', 'discord');
// });

discordClient.on('error', error => {
    logger.log(error, 'ERROR', 'discord');
});

discordClient.on('warn', warn => {
    logger.log(warn, 'WARN', 'discord');
});

//
// Discord
//
discordClient.login(config.discord.token);

discordClient.once('disconnect', () => {
	logger.warn('Disconnected from Discord');
});

discordClient.once('ready', () => {
    logger.info('Online and connected to Discord');

    //discordClient.user.setPresence({ activities: [{ name: `Beta v${package.version}` }], status: 'online' });
    discordClient.guilds.fetch(config.discord.guildID).then((g) => {
        g.commands.set(discordClient.commands);
        logger.info(`Updated slash commands for guild: '${g.name}' (${g.id})`);
    });
});


// Handle messages
discordClient.on('messageCreate', async message => {
    if(message.author.bot) return;
    if(message.content.startsWith(config.discord.botPrefix)) return;

    if(message.guild.id == config.discord.guildID) {
        logger.message(message.channel.name, message.author.username, message.content.replace(/(?:\r\n|\r|\n)/g, " "));
        vip(logger, message, 1);
    }
});

discordClient.on('messageUpdate', (oldMessage, newMessage) => {
    if(oldMessage.content == newMessage.content) return;
    logger.message(newMessage.channel.name, newMessage.author.username, "{EDITED} " + newMessage.content.replace(/(?:\r\n|\r|\n)/g, " "));
});


// Handle interactions
discordClient.on('interactionCreate', async interaction => {
    logger.info(`Received interaction: '${interaction.id}' from '${interaction.member.displayName}'`);
    const command = discordClient.commands.get(interaction.commandName.toLowerCase());

    try {
        command.execute(logger, interaction, discordClient); 
        logger.info(`Ran command: '${command.name}' from '${interaction.member.displayName}'`);
        
    } catch(err) {
        logger.warn(`Unknown command: '${interaction.id}' from '${message.author.username}' (${interaction.guild.name})`);
        logger.error(err);
        interaction.followUp({
            content: ':x: `' + err + '`',
            ephemeral: true
        });
    }
});

// Member Update
discordClient.on("guildMemberUpdate", (oldMember, newMember) => {
    try {
        if (!oldMember.premiumSince && newMember.premiumSince) {
            discordClient.channels.fetch(config.discord.vip_ch).then((channel) => {
                addToVips(newMember, channel, 90);
            });
        }
    
        if(!oldMember.roles.cache.find(r => r.name === "Streamers") && newMember.roles.cache.find(r => r.name === "Streamers")) {
            Twitch.users.getByLogin(newMember.user.username).then((user) => {
                console.log(user);
                if(user != undefined && user.id != undefined && user.display_name != null) {
                    db.run(`INSERT INTO twitchAccounts VALUES("${user.id}", "${user.display_name}", "${config.discord.live_ch}", "${newMember.user.id}", "${newMember.user.username}", "online")`, (err) => {
                        if(err){
                            logger.warn(err);
                        }
                        else {
                            logger.info(`Added new Twitch account '${user.display_name}' (${user.id})`);
                        }
                    });
                }
                else {
                    logger.error(`Could not find a Twitch account called ${newMember.user.username}`);
                }
            });
        }
    } catch (err) {
        logger.error(err);
    };
});


// New member joins
discordClient.on('guildMemberAdd', member => {
    OnMemberJoin(logger, member, discordClient);
});


// Member leaves
discordClient.on('guildMemberRemove', member => {
    OnMemberLeave(logger, member, discordClient);
});

// Date Events
clock.on('*-*-* 00:00', function (rawDate) {
    var date = FormatDate(rawDate);

    logger.info(`Checking VIPs for today`)
    discordClient.guilds.fetch(config.discord.guildID).then((guild) => {
        db.serialize(() => {
            db.all(`SELECT * FROM vips WHERE expireDate = "${date}"`, (err, rows) => {
                if(err){
                    logger.error(err);
                }
                else
                {
                    rows.forEach((row) => {
                        guild.members.fetch(row.discordID).then((member) => {
                            member.roles.remove(member.guild.roles.cache.find(r => r.name === "VIP"));
    
                            db.serialize(() => {
                                db.run(`DELETE FROM vips WHERE expireDate = "${date}"`, function(err) {
                                    if(err) {
                                        logger.error(err);
                                    }
                                    else {
                                        logger.info(`Removed VIP '${member.displayName}' (${member.user.id})`)
                                    }
                                });
    
                                db.run(`UPDATE users SET vipProgress = 0, isVIP = "false" WHERE discordID = "${member.user.id}"`, function(err) {
                                    if(err) {
                                        logger.error(err);
                                    }
                                    else {
                                        logger.info(`Reset '${member.displayName}' (${member.user.id}) VIP progress`)
                                    }
                                });
                            })
                        });
                    });
                }
            });

            // db.run(`UPDATE users SET vipProgress = 0`, function(err) {
            //     if(err) {
            //         logger.error(err, "vipProgress");
            //     }
            //     else {
            //         logger.info(`Reset all users VIP progress`, 'app')
            //     }
            // });
        });
    });
});

function FormatDate(date)
{
    var d = new Date(date);
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var year = d.getFullYear();
    return year + '-' + month + '-' + day;
}


//
// Twitter API
// -------------------------------------------------------------
//
var Twitter = new Twit({
    consumer_key: config.twitter.consumer_key,
    consumer_secret: config.twitter.consumer_secret,
    access_token: config.twitter.access_token,
    access_token_secret: config.twitter.access_token_secret
});

const getTwitterUsers = () => {
    return new Promise((res, rej) => {
        let result = [];
        db.each(`SELECT ID FROM tweetAccounts`, (err, row) => {
            if(err) {
                rej(err)
            }
            result.push(row.ID);
        }, () => {
            res(result);
        })
    })
};

getTwitterUsers().then((users) => {
    logger.info('Gathered users from database');
    var tweetStream = Twitter.stream('statuses/filter', { follow: users });

    tweetStream.on('disconnected', function(disconnect) {
        logger.warn('Disconnected from follow tweet stream');
    });

    tweetStream.on('connect', function (request) {
        logger.info('Connecting to follow tweetStream...');
    });

    tweetStream.on('connected', function (response) {
        logger.info(`Connected to tweetStream with message: '${response.statusMessage}' (Code: ${response.statusCode})`);
    });

    tweetStream.on('tweet', function(tweet) {
        OnNewTweet(logger, tweet, discordClient, db, users);
    })
});

//
// Twitch API
// -------------------------------------------------------------
//
const Twitch = new HelixAPI({
    access_token: config.twitch.access_token,
    client_id: config.twitch.client_id,
    redirect_url: "http://localhost"
});

function getTwitchToken() {
    request.post(`https://id.twitch.tv/oauth2/token?client_id=${config.twitch.client_id}&client_secret=${config.twitch.client_secret}&grant_type=client_credentials`, (err, res, body) => {
        if (!err && res.statusCode == 200) {
            var data = JSON.parse(body);
            console.log(data);
            return data.data.access_token;
        }
        else {
            logger.info(`Error: '${err}' with message: '${res.statusMessage}' (Code: ${res.statusCode})`, 'getTwitchToken');
        }
    });
}

setInterval(async function() {
    await checkOfflineUsers(logger, discordClient);
    await checkOnlineUsers(logger);
}, 10000);