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
const checkTwitchUsers = require('./functions/checkTwitchUsers.js');

// Events
const OnMemberJoin = require('./events/OnMemberJoin');
const OnMemberLeave = require('./events/OnMemberLeave');
const OnNewTweet = require('./events/OnNewTweet');
const OnNewInteraction = require('./events/OnInteraction');

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
logger.info(`${package.name} v${package.version}`);

logger.on('error', function(err) {
    discordClient.users.fetch('190612480958005248').then(user => {
        user.send('```js\n' + err + '```').then(msg => {
            process.exit(1);
        })
    });
});

clock.on('23:59', () => {
    logger.save();
});

if(config.debugMode) {
    logger.debug('---STARTING IN DEBUG MODE!---');
    discordClient.on('debug', debug => {
        logger.log(debug, 'DEBUG', 'discord');
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

discordClient.once('disconnect', () => {
	logger.warn('Disconnected from Discord');
});

discordClient.once('ready', () => {
    logger.info('Online and connected to Discord');
    discordClient.guilds.fetch(config.discord.guildID).then((g) => {
        g.commands.set(discordClient.commands);
        logger.info(`Updated slash commands for guild: '${g.name}' (${g.id})`);
    });

    if(config.debugMode) {
        discordClient.user.setPresence({ activities: [{ name: `v${package.version}`, type:'WATCHING' }], status: 'dnd' });
    }
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
    OnNewInteraction(logger, interaction, discordClient);
});

// Member Update
discordClient.on("guildMemberUpdate", (oldMember, newMember) => {
    try {
        if (!oldMember.premiumSince && newMember.premiumSince) {
            discordClient.channels.fetch(config.discord.vip_ch).then((channel) => {
                addToVips(logger, newMember, channel, 90);
            });
        }
    
        if(!oldMember.roles.cache.find(r => r.name === "Streamers") && newMember.roles.cache.find(r => r.name === "Streamers")) {
            Twitch.users.getByLogin(newMember.user.username).then((user) => {
                logger.info(`Searching Twitch for: '${user.display_name}'`);
                if(user != undefined && user.id != undefined && user.display_name != null) {
                    db.run(`INSERT INTO twitchAccounts VALUES("${user.id}", "${user.display_name}", "${config.discord.live_ch}", "${newMember.user.id}", "${newMember.user.username}", "online", 0, null)`, (err) => {
                        if(err){
                            logger.warn(err);
                        }
                        else {
                            logger.info(`Added new Twitch account '${user.display_name}' (${user.id})`);
                        }
                    });
                }
                else {
                    logger.warn(`Could not find a Twitch account called ${newMember.user.username}`);
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

    logger.info(`Checking VIPs for today`);
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
                            });
                        });
                    });
                }
            });

            db.all(`SELECT * FROM channels ORDER BY daily DESC`, (err, rows) => {
                let dailyMessages = 0;
                let dailyString = "";

                if(rows != null && rows != undefined) {
                    rows.forEach(row => {
                        dailyMessages = dailyMessages + parseInt(row.daily);
                        dailyString += `${row.name}: ${formatCommas(row.daily)}\n`
                    });

                    const embed = new Discord.MessageEmbed()
                    .setColor(config.discord.embedHex)
                    .setTitle(`Counts for ${FormatDate(Date.now())}`)
                    .setDescription(`${dailyString}\nTotal today: ${formatCommas(dailyMessages)}`)
                    .setFooter({ text: guild.name, iconURL: guild.iconURL() });

                    discordClient.channels.fetch(config.discord.post_ch).then((channel) => {
                        channel.send({embeds: [embed]});
                    });
                }
            });

            db.run(`UPDATE channels SET daily = 0`, function(err) {
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
    let vipAmount = 0;
    
    db.serialize(() => {
        db.all(`SELECT * FROM users WHERE vipProgress >= 8`, (err, rows) => {
            rows.forEach((row) => {
                console.log(row);
                messages.push(row.vipProgress);
                db.run(`INSERT INTO messageHistory VALUES("${month}", "${row.discordID}", "${row.username}", "${row.vipProgress}", "${row.totalMessages}")`, function(err) {
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
            db.run(`UPDATE users SET vipProgress = 0, toVIP = ${vipAmount} WHERE isVIP = "false"`, function(err) {
                if(err) {
                    logger.warn(err);
                }
                else {
                    logger.info(`Reset all users VIP progress`);
                }
            });

            db.run(`UPDATE channels SET monthly = 0`, function(err) {
                if(err) {
                    logger.warn(err);
                }
                else {
                    logger.info(`Reset all channels monthly count.`);
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
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var year = d.getFullYear();
    return year + '-' + month + '-' + day;
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

    return `${months[index]} ${d.getFullYear()}`;
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
    });
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

clock.on('*:*', function(rawTime) {
    checkTwitchUsers(logger, discordClient, rawTime);
});