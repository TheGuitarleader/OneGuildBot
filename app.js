const fs = require('fs');
const Discord = require('discord.js');
const Client = require('./client/client.js');
const Twit = require('twit');
const config = require('./config.json');
const package = require('./package.json');
const logger = require('kailogs');
const clock = require('date-events')();
const moment = require('moment');

// Events
const OnMemberJoin = require('./events/OnMemberJoin');
const OnMemberLeave = require('./events/OnMemberLeave');
const OnTweet = require('./events/OnNewTweet');
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

logger.loadLog('./logs');
logger.log(`${package.name} v${package.version}`, 'main');
discordClient.login(config.discord.token);

// Saves the log at 11:59pm
clock.on('23:59', function (date) {
    logger.save();
    logger.createLog('./logs');
});

discordClient.once('disconnect', () => {
	logger.warn('Disconnected from Discord', 'discord');
});

discordClient.once('ready', () => {
    logger.log('Online and connected to Discord', 'discord');
    discordClient.user.setPresence({ activities: [{ name: `Beta v${package.version}` }], status: 'online' });
    discordClient.guilds.fetch(config.discord.guildID).then((g) => {
        g.commands.set(discordClient.commands);
        logger.log(`Updated slash commands for guild: '${g.name}' (${g.id})`, 'discord');
    });
});


// Handle messages
discordClient.on('messageCreate', async message => {
    if(message.author.bot) return;
    if(!message.content.startsWith(config.discord.botPrefix)) return;

    console.log(message.author.id);
    
    // try {
    //     const args = message.content.slice(config.discord.botPrefix.length).split(/ +/);
    //     const commandName = args.shift().toLowerCase();
    //     const command = client.commands.get(commandName);
    //     command.execute(message, client); 
    //     logger.log(`Ran command: '${config.discord.botPrefix}${commandName}' from '${message.author.username}'`, 'main');
        
    // } catch(err) {
    //     logger.warn(`Unknown command: '${message.content}' from '${message.author.username}' (${message.guild.name})`, 'main');
    //     logger.error(err, 'main');
    // }
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


// New member joins
discordClient.on('guildMemberAdd', member => {
    OnMemberJoin(member, discordClient);
});


// Member leaves
discordClient.on('guildMemberRemove', member => {
    OnMemberLeave(member, discordClient);
});


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

const getUsers = () => {
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

getUsers().then((users) => {
    logger.log('Gathered users from database', 'twitter');
    var tweetStream = Twitter.stream('statuses/filter', { follow: users });

    tweetStream.on('disconnected', function(disconnect) {
        logger.warn('Disconnected from follow tweet stream', 'twitter');
        console.log(disconnect);
    });

    tweetStream.on('connect', function (request) {
        logger.log('Connecting to follow tweetStream...', 'twitter');
    });

    tweetStream.on('connected', function (response) {
        logger.log(`Connected to tweetStream with message: '${response.statusMessage}' (Code: ${response.statusCode})`, 'twitter');
    });

    tweetStream.on('tweet', function(tweet) {
        OnNewTweet(tweet, discordClient, db, users);
    })
})