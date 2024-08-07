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
const process = require('process');

// Functions
const checkTwitchUsers = require('./functions/checkTwitchUsers.js');

// Events
const OnMemberJoin = require('./events/OnMemberJoin');
const OnMemberLeave = require('./events/OnMemberLeave');
const OnNewTweet = require('./events/OnNewTweet');
const OnNewInteraction = require('./events/OnInteraction');
const OnMessage = require('./events/OnMessage');
const OnDeleteMessage = require('./events/OnDeleteMessage');
const OnEditMessage = require('./events/OnEditMessage');

const discordClient = new Client();
discordClient.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for(const file of commandFiles) {
    const command = require(`./commands/${file}`);
    discordClient.commands.set(command.name, command);
}

//
// Logging
//
const Margo = require('margojs');
const logger = new Margo.logger('./', config.logging, package);
new Margo.exceptions(logger).handle();
new Margo.rejections(logger).handle();

logger.on('error', function(err) {
    setTimeout(_gracefulExit, 2000);
    discordClient.users.fetch('190612480958005248').then(user => {
        user.send('```js\n' + err + '```');
    });
});

function _gracefulExit() {
    process.exit(1);
}

clock.on('23:59', () => {
    logger.save();
});

if(config.debugMode) {
    logger.debug('---STARTING IN DEBUG MODE!---');
    discordClient.on('debug', debug => {
        logger.log(debug, 'DEBUG', 'discordClient');
    });
}

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

const discordWebhook = new Discord.WebhookClient({
    id: config.discord.appID,
    token: config.discord.token
})

discordClient.once('disconnect', () => {
	logger.warn('Disconnected from Discord');
});

discordClient.once('ready', () => {
    process.send('ready');
    logger.info('Online and connected to Discord');
    discordClient.guilds.fetch(config.discord.guildID).then((g) => {
        g.commands.set(discordClient.commands);
        logger.info(`Updated slash commands for guild: '${g.name}' (${g.id})`);
    });

    // let channels = discordClient.channels.cache;
    // for (const channel of channels.values())
    // {
    //     discordClient.db.query(`UPDATE all_messages SET channel_id = ${channel.id} WHERE channel_name = "${channel.name}";`, (err) => {
    //         if(err) {
    //             console.error(err);
    //         }
    //         else {
    //             console.log(`UPDATE all_messages SET channel_id = ${channel.id} WHERE channel_name = "${channel.name}";`);
    //         }
    //     });
    // }

    if(config.debugMode) {
        discordClient.user.setPresence({ activities: [{ name: `v${package.version}`, type:'WATCHING' }], status: 'dnd' });
        checkTwitchUsers(logger, discordClient, new Date(Date.now()));
    }
});

// Webhook Updates
if(config.debugMode || true) {
    console.debug(`Webhook URL: ${discordWebhook.url}`);

    discordWebhook.once('debug', debug => {
        logger.log(debug, 'DEBUG', 'discordWebhook');
    })
}

discordWebhook.on('apiRequest', request => {
    console.log(request);
})

discordWebhook.once('apiResponse', response => {
    console.log(response);
})

// Handle messages
let ignoredChannels = [ '799134128091299892', '895103944341209108', '963843942766501948', '995114322600669205' ];

discordClient.on('messageCreate', async message => {
    if(message.author.bot) return;
    if(message.content.startsWith(config.discord.botPrefix)) return;
    if(ignoredChannels.includes(message.channel.id)) return;

    if(message.guild.id == config.discord.guildID) {
        OnMessage(logger, message, discordClient);
    }
});

discordClient.on('messageUpdate', (oldMessage, newMessage) => {
    if(ignoredChannels.includes(newMessage.channel.id)) return;
    if(oldMessage.content == newMessage.content) return;
    OnEditMessage(logger, oldMessage, newMessage, discordClient);
});

discordClient.on('messageDelete', message => {
    if(message.author.bot) return;
    if(message.content.startsWith(config.discord.botPrefix)) return;
    if(ignoredChannels.includes(message.channel.id)) return;

    OnDeleteMessage(logger, message, discordClient);
});


// Handle interactions
discordClient.on('interactionCreate', async interaction => {
    logger.info(`Received interaction: '${interaction.id}' from '${interaction.member.displayName}'`);
    OnNewInteraction(logger, interaction, discordClient);
});

// Member Update
discordClient.on("guildMemberUpdate", (oldMember, newMember) => {
    try {
        if (!oldMember.premiumSince && newMember.premiumSince) {
            discordClient.channels.fetch(config.discord.vip_ch).then((channel) => {
                if(!newMember.roles.cache.find(r => r.name === "Guild Leaders") && !newMember.roles.cache.find(r => r.name === "Guild Managers") && !newMember.roles.cache.find(r => r.name === "Guild Members"))
                {
                    sqliteDB.get(`SELECT * FROM users WHERE discordID = "${newMember.user.id}" AND isVIP = "false"`, [], (err, row) => {
                        if(err) {
                            logger.error(err);
                        }
                        else if(row != undefined) {
                            if(row.vipProgress >= row.toVIP) {
                                addToVips(logger, newMember, channel, 90);
                            }
                        }
                        else if(config.debugMode) {
                            logger.debug(`Ignoring '${newMember.displayName}' because they are already a VIP!`);
                        }
                    });
                }
                else if(config.debugMode) {
                    logger.debug(`Ignoring '${newMember.displayName}' because they are either a 'Guild Manager' or 'Guild Member'`);
                }
            });
        }
    
        // if(!oldMember.roles.cache.find(r => r.name === "Streamers") && newMember.roles.cache.find(r => r.name === "Streamers")) {
        //     Twitch.users.getByLogin(newMember.user.username).then((user) => {
        //         logger.info(`Searching Twitch for: '${user.display_name}'`);
        //         if(user != undefined && user.id != undefined && user.display_name != null) {
        //             sqliteDB.run(`INSERT INTO twitchAccounts VALUES("${user.id}", "${user.display_name}", "${config.discord.live_ch}", "${newMember.user.id}", "${newMember.user.username}", "online", 0, null)`, (err) => {
        //                 if(err){
        //                     logger.warn(err);
        //                 }
        //                 else {
        //                     logger.info(`Added new Twitch account '${user.display_name}' (${user.id})`);
        //                 }
        //             });
        //         }
        //         else {
        //             logger.warn(`Could not find a Twitch account called ${newMember.user.username}`);
        //         }
        //     });
        // }
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

    logger.info(`Checking VIPs for today`);
    discordClient.guilds.fetch(config.discord.guildID).then((guild) => {
        sqliteDB.serialize(() => {
            sqliteDB.all(`SELECT * FROM vips WHERE expireDate = "${date}"`, (err, rows) => {
                if(err){
                    logger.error(err);
                }
                else
                {
                    rows.forEach((row) => {
                        guild.members.fetch(row.discordID).then((member) => {
                            member.roles.remove(member.guild.roles.cache.find(r => r.name === "VIP"));
    
                            sqliteDB.serialize(() => {
                                sqliteDB.run(`DELETE FROM vips WHERE expireDate = "${date}"`, function(err) {
                                    if(err) {
                                        logger.error(err);
                                    }
                                    else {
                                        logger.info(`Removed VIP '${member.displayName}' (${member.user.id})`)
                                    }
                                });
    
                                sqliteDB.run(`UPDATE users SET vipProgress = 0, isVIP = "false" WHERE discordID = "${member.user.id}"`, function(err) {
                                    if(err) {
                                        logger.error(err);
                                    }
                                    else {
                                        logger.info(`Reset '${member.displayName}' (${member.user.id}) VIP progress`)
                                    }
                                });
                            });
                        });
                    });
                }
            });

            sqliteDB.all(`SELECT * FROM channels ORDER BY daily DESC`, (err, rows) => {
                let dailyMessages = 0;
                let dailyString = "";
        
                if(rows != null && rows != undefined) {
                    rows.forEach(row => {
                        if(row.daily > 0) {
                            dailyMessages = dailyMessages + parseInt(row.daily);
                            dailyString += `${row.name}: ${formatCommas(row.daily)}\n`;

                            sqliteDB.run(`INSERT OR IGNORE INTO dailyCounts VALUES("${FormatDate(Date.now())}", "${row.id}", "${row.name}", ${row.daily})`, (err) => {
                                if(err) {
                                    logger.warn(err);
                                }
                            });
                        }
                    });
        
                    const embed = new Discord.MessageEmbed()
                    .setColor(config.discord.embedHex)
                    .setTitle(`Counts for ${GetYesterday()}`)
                    .setDescription(`**${dailyString}\nTotal today: ${formatCommas(dailyMessages)}**`)
                    .setFooter({ text: guild.name, iconURL: guild.iconURL() });
        
                    discordClient.channels.fetch(config.discord.post_ch).then((channel) => {
                        channel.send({embeds: [embed]});
                    });
                }
            });

            sqliteDB.run(`UPDATE channels SET daily = 0`, function(err) {
                if(err) {
                    logger.warn(err);
                }
                else {
                    logger.info(`Reset all channels daily count.`);
                }
            });
        });
    });
});

clock.on('*-*-01 00:00', function (rawDate) {
    let messages = [];
    let month = GetMonth(-1);
    let year = new Date(Date.now()).getFullYear();
    let vipAmount = 0;
    
    sqliteDB.serialize(() => {
        sqliteDB.all(`SELECT * FROM users WHERE vipProgress >= 8`, (err, rows) => {
            rows.forEach((row) => {
                console.log(row);
                messages.push(row.vipProgress);
                sqliteDB.run(`INSERT INTO messageHistory VALUES("${month} ${year}", "${row.discordID}", "${row.username}", "${row.vipProgress}", "${row.totalMessages}")`, function(err) {
                    if(err) {
                        logger.warn(err);
                    }
                    else {
                        logger.info(`Added '${row.username}' to messageHistory`);
                        console.log(messages);
                    }
                });
            });

            vipAmount = findAverage(messages);
            console.log(vipAmount);
            sqliteDB.run(`UPDATE users SET vipProgress = 0, toVIP = ${vipAmount}`, function(err) {
                if(err) {
                    logger.warn(err);
                }
                else {
                    logger.info(`Reset all users VIP progress`);
                }
            });
        });
    })
});

function findAverage(array) {
    let total = 0;
    array.forEach((a) => {
        let value = parseInt(a);
        total = total + value;
    });

    return Math.round((total / array.length));
}

function formatCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function FormatDate(date)
{
    var d = new Date(date);
    var month = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    var year = d.getFullYear();
    return year + '-' + month + '-' + day;
}

function GetYesterday()
{
    var yesterday = moment().subtract(1, 'days');
    return yesterday.format('MMMM D, YYYY');
}

function GetMonth(offset) {
    let months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

    var d = new Date(Date.now());
    let index = d.getMonth() + offset;

    if(index < 0) {
        index = 12
    }
    else if(index > 12) {
        index = 0
    }

    console.log(index);

    return `${months[index]}`;
}

// function GetTime()
// {
//     var time = new Date();
//     hours = ("0" + time.getHours()).slice(-2);
//     var minutes = new Date().getMinutes();
//     minutes = ("0" + time.getMinutes()).slice(-2);
//     var seconds = new Date().getSeconds();
//     seconds = ("0" + time.getSeconds()).slice(-2);
//     return hours + ":" + minutes + ":" + seconds
// }


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
        sqliteDB.each(`SELECT ID FROM tweetAccounts`, (err, row) => {
            if(err) {
                rej(err)
            }
            result.push(row.ID);
        }, () => {
            res(result);
        })
    })
};

// getTwitterUsers().then((users) => {
//     logger.info('Gathered users from database');
//     var tweetStream = Twitter.stream('statuses/filter', { follow: users });

//     tweetStream.on('disconnected', function(disconnect) {
//         logger.warn('Disconnected from follow tweet stream');
//     });

//     tweetStream.on('connect', function (request) {
//         logger.info('Connecting to follow tweetStream...');
//         if(config.debugMode) {
//             logger.debug(tweetStream.);
//         }
//     });

//     tweetStream.on('connected', function (response) {
//         logger.info(`Connected to tweetStream with message: '${response.statusMessage}' (Code: ${response.statusCode})`);
//     });

//     tweetStream.on('tweet', function(tweet) {
//         OnNewTweet(logger, tweet, discordClient, sqliteDB, users);
//     });

//     clock.on('hour', function (date) {
//         if(config.debugMode) {
//             logger.debug("Refreshing tweet stream...");
//         }

//         tweetStream.stop();
//         tweetStream.start();
//     });
// });

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
    return new Promise((res, rej) => {
        request.post(`https://id.twitch.tv/oauth2/token?client_id=${config.twitch.client_id}&client_secret=${config.twitch.client_secret}&grant_type=client_credentials`, (err, response, body) => {
            if (!err && response.statusCode == 200) {
                var data = JSON.parse(body);
                res(data);
            }
            else {
                logger.info(`Error: '${err}' with message: '${response.statusMessage}' (Code: ${response.statusCode})`, 'getTwitchToken');
                rej(null);
            }
        });
    });
}

clock.on('*:*', function(rawTime) {
    checkTwitchUsers(logger, discordClient, rawTime);
    
    if(config.debugMode) {
        console.log(rawTime);
        logger.info("Requesting Twitch info...");
    }

    // Check if token is valid
    var expiresIn = new Date(config.twitch.expires_in).getTime();
    var currentTime = Date.now();

    if(currentTime > expiresIn) {
        console.log('Generating new token...');

        getTwitchToken().then(token => {
            config.twitch.access_token = token.access_token;
            config.twitch.expires_in = (Date.now() + (token.expires_in * 1000));

            fs.writeFile('./config.json', JSON.stringify(config, null, 2), function writeJSON(err) {
                if (err) return logger.error(err);
                logger.info(`Updated access token. Time extended from '${FormatDate(expiresIn)}' -> '${FormatDate(new Date(config.twitch.expires_in).getTime())}'`);
                discordClient.users.fetch('190612480958005248').then(user => {
                    user.send(`Updated access token. Time extended from '${FormatDate(expiresIn)}' -> '${FormatDate(new Date(config.twitch.expires_in).getTime())}'`);
                });
            });
    
            setTimeout(_gracefulExit, 2000);
            logger.info('Restarting bot with new token...');
        });
    }
});