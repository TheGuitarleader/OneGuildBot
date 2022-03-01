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
const logger = require('./extensions/logging');

// Functions
const vip = require('./functions/vipProgress.js');
const addToVips = require('./functions/addToVips.js');
const checkOfflineUsers = require('./functions/checkOfflineUsers.js')
const checkOnlineUsers = require('./functions/checkOnlineUsers.js')

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

console.log(discordClient.commands);

logger.loadLog('./logs/Console');
logger.loadMessage('./logs/Messages');
logger.loadAPI('./logs/API');
logger.log(`${package.name} v${package.version}`, 'main');
discordClient.login(config.discord.token);

// Saves the log at 11:59pm
clock.on('23:59', function (date) {
    logger.save();
});

discordClient.once('disconnect', () => {
	logger.warn('Disconnected from Discord', 'discord');
});

discordClient.once('ready', () => {
    logger.log('Online and connected to Discord', 'discord');
    //discordClient.user.setPresence({ activities: [{ name: `Beta v${package.version}` }], status: 'online' });
    discordClient.guilds.fetch(config.discord.guildID).then((g) => {
        g.commands.set(discordClient.commands);
        logger.log(`Updated slash commands for guild: '${g.name}' (${g.id})`, 'discord');
    });
});


// Handle messages
discordClient.on('messageCreate', async message => {
    if(message.author.bot) return;
    if(message.content.startsWith(config.discord.botPrefix)) return;

    if(message.guild.id == config.discord.guildID) {
        logger.message(message.channel, message.author, message.content);
        vip(message, 1);
    }
});


// Handle interactions
discordClient.on('interactionCreate', async interaction => {
    logger.log(`Received interaction: '${interaction.id}' from '${interaction.member.displayName}'`, 'discord');
    const command = discordClient.commands.get(interaction.commandName.toLowerCase());

    try {
        command.execute(interaction, discordClient); 
        logger.log(`Ran command: '${command.name}' from '${interaction.member.displayName}'`, 'discord');
        
    } catch(err) {
        logger.warn(`Unknown command: '${interaction.id}' from '${message.author.username}' (${interaction.guild.name})`, 'discord');
        logger.error(err, 'discord');
        interaction.followUp({
            content: ':x: `' + err + '`',
            ephemeral: true
        });
    }
});

// Member Update
discordClient.on("guildMemberUpdate", (oldMember, newMember) => {
    if (!oldMember.premiumSince && newMember.premiumSince) {
        discordClient.channels.fetch(config.discord.vip_ch).then((channel) => {
            addToVips(newMember, channel, 90);
        });
    }

    if(!oldMember.roles.cache.find(r => r.name === "Streamers") && newMember.roles.cache.find(r => r.name === "Streamers")) {
        Twitch.users.getByLogin(newMember.user.username).then((user) => {
            console.log(user);
            if(user != undefined) {
                db.run(`INSERT INTO twitchAccounts VALUES("${user.id}", "${user.display_name}", "${config.discord.live_ch}", "${newMember.user.id}", "${newMember.user.username}", "online")`, (err) => {
                    if(err){
                        logger.warn(err, 'app');
                    }
                    else {
                        logger.log(`Added new Twitch account '${user.display_name}' (${user.id})`, 'app');
                    }
                });
            }
            else {
                logger.error(`Could not find a account called `);
            }
        });
    }
});


// New member joins
discordClient.on('guildMemberAdd', member => {
    OnMemberJoin(member, discordClient);
});


// Member leaves
discordClient.on('guildMemberRemove', member => {
    OnMemberLeave(member, discordClient);
});

// Date Events
clock.on('*-*-* 00:00', function (rawDate) {
    var date = FormatDate(rawDate);

    logger.log(`Checking VIPs for today`)
    discordClient.guilds.fetch(config.discord.guildID).then((guild) => {
        db.serialize(() => {
            db.all(`SELECT * FROM vips WHERE expireDate = "${date}"`, (err, rows) => {
                if(err){
                    console.log(err);
                    logger.error(err, 'app');
                }
                else
                {
                    rows.forEach((row) => {
                        guild.members.fetch(row.discordID).then((member) => {
                            member.roles.remove(member.guild.roles.cache.find(r => r.name === "VIP"));
    
                            db.serialize(() => {
                                db.run(`DELETE FROM vips WHERE expireDate = "${date}"`, function(err) {
                                    if(err) {
                                        logger.error(err, 'app');
                                    }
                                    else {
                                        logger.log(`Removed VIP '${member.displayName}' (${member.user.id})`, 'app')
                                    }
                                });
    
                                db.run(`UPDATE users SET vipProgress = 0, isVIP = "false" WHERE discordID = "${member.user.id}"`, function(err) {
                                    if(err) {
                                        logger.error(err, "vipProgress");
                                    }
                                    else {
                                        logger.log(`Reset '${member.displayName}' (${member.user.id}) VIP progress`, 'app')
                                    }
                                });
                            })
                        });
                    });
                }
            });

            db.run(`UPDATE users SET vipProgress = 0`, function(err) {
                if(err) {
                    logger.error(err, "vipProgress");
                }
                else {
                    logger.log(`Reset all users VIP progress`, 'app')
                }
            });
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
    logger.logAPI('Gathered users from database', 'twitter');
    var tweetStream = Twitter.stream('statuses/filter', { follow: users });

    tweetStream.on('disconnected', function(disconnect) {
        logger.warnAPI('Disconnected from follow tweet stream', 'twitter');
    });

    tweetStream.on('connect', function (request) {
        logger.logAPI('Connecting to follow tweetStream...', 'twitter');
    });

    tweetStream.on('connected', function (response) {
        logger.logAPI(`Connected to tweetStream with message: '${response.statusMessage}' (Code: ${response.statusCode})`, 'twitter');
    });

    tweetStream.on('tweet', function(tweet) {
        OnNewTweet(tweet, discordClient, db, users);
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
            logger.logAPI(`Error: '${err}' with message: '${res.statusMessage}' (Code: ${res.statusCode})`, 'getTwitchToken');
        }
    });
}

setInterval(async function() {
    console.log("Refreshing Twitch streams...");
    await checkOfflineUsers(discordClient);
    await checkOnlineUsers();
}, 20000);