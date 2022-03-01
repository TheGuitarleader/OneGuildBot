const Discord = require('discord.js');
const config = require('../config.json');
const logger = require('../extensions/logging');

const Twit = require('twit');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

var Twitter = new Twit({
    consumer_key: config.twitter.consumer_key,
    consumer_secret: config.twitter.consumer_secret,
    access_token: config.twitter.access_token,
    access_token_secret: config.twitter.access_token_secret
});

module.exports = {
    name: "twitter",
    description: "Configures tweet forwarding.",
    options: [
        {
          name: 'type',
          type: 3,
          description: 'The type of action',
          required: true,
          choices: [
            {
                name: 'Follow new user',
                value: 'add'
            },
            {
                name: 'Update user',
                value: 'update'
            },
            {
                name: 'Unfollow user',
                value: 'remove'
            }
          ]
        },
        {
            name: 'twitter_name',
            type: 3,
            description: 'The @ of a Twitter user.',
            required: true
        },
        {
            name: 'user',
            type: 6,
            description: 'The discord user of the followed Twitter account.',
            required: true
        },
        {
            name: 'channel',
            type: 7,
            description: 'The channel for the tweets to be forwarded to.',
            required: true
        },
        {
            name: 'show_replies',
            type: 5,
            description: 'If I should send you the users replies. Default: false'
        },
        {
            name: 'show_retweets',
            type: 5,
            description: 'If I should send you the users retweets. Default: false'
        }
    ],
    async execute(interaction, client) {
        if(config.discord.ownerIDs.includes(interaction.member.id)) {
            var type = interaction.options.get('type').value;
            if(type == 'add') {
                Twitter.get('users/show', { screen_name: interaction.options.get('twitter_name').value },  function (err, data, response) {
                    if(err) {
                        interaction.reply({
                            content: ":x: **Could not find a account called** `" + interaction.options.get('twitter_name').value + "`",
                            ephemeral: true
                        });
                    } 
                    else {
                        db.serialize(() => {
                            db.run(`INSERT OR IGNORE INTO tweetAccounts VALUES("${data.id_str}", "${data.screen_name}")`, (err) => {
                                if(err){
                                    logger.error(err, 'twitter');
                                }
                            });
        
                            console.log(interaction.options.get('show_replies'));
                            db.run(`INSERT INTO tweetProfiles VALUES("${interaction.options.getUser('user').id}", "${interaction.options.getChannel('channel').id}", "${data.id_str}", "${interaction.options.getUser('user').username}", "${data.screen_name}", "${defaultBool(interaction.options.get('show_replies'))}", "${defaultBool(interaction.options.get('show_retweets'))}")`, (err) => {
                                if(err){
                                    logger.warn(err, 'twitter');
                                    interaction.reply({
                                        content: ':x: `' + data.screen_name + '`** is already being followed!** ```' + err + '```',
                                        ephemeral: true
                                    });
                                }
                                else
                                {
                                    logger.log(`Followed new account '${data.screen_name}' (${data.id_str})`, 'twitter');
    
                                    const embed = new Discord.MessageEmbed()
                                    .setColor(data.profile_link_color)
                                    .setAuthor({ name: `${data.name} (@${data.screen_name})`, iconURL: data.profile_image_url, url: `https://twitter.com/${data.screen_name}` })
                                    .setDescription(data.description)
                                    .addField("Following", formatCommas(data.friends_count), true)
                                    .addField("Followers", formatCommas(data.followers_count), true)
                                    .setFooter({ text: 'Powered By Tweeter' })
      
                                    interaction.reply({
                                        content: ':white_check_mark: **Successfully started following `' + data.screen_name + '`.**  *Please allow up to a hour to start receiving tweets!*',
                                        embeds: [ embed ],
                                        ephemeral: true
                                    });
                                }
                            });
                        })
                    }
                });
            }
            else if(type == 'update') {
                db.run(`UPDATE tweetProfiles SET channelID = "${interaction.options.getChannel('channel').id}", showReplies = "${defaultBool(interaction.options.get('show_replies'))}", showRetweets = "${defaultBool(interaction.options.get('show_retweets'))}" WHERE discordID = "${interaction.options.getUser('user').id}"`, (err) => {
                    if(err){
                        logger.warn(err, 'twitter');
                        interaction.reply({
                            content: '```' + err + '```',
                            ephemeral: true
                        });
                    }
                    else
                    {
                        logger.log(`Updated ${interaction.options.getUser('user').username}'s profile (${interaction.options.getUser('user').id})`, 'twitter');
                        interaction.reply({
                            content: ':white_check_mark: **Successfully updated profile.**',
                            ephemeral: true
                        });
                    }
                });
            }
            else if(type == 'remove') {
                db.serialize(() => {
                    db.all(`SELECT * FROM tweetProfiles WHERE discordID = "${interaction.options.getUser('user').id}"`, (err, row) => {
                        if(err) {
                            console.log(err);
                        }
                        else {
                            db.run(`DELETE FROM tweetAccounts WHERE ID = "${row.accountID}"`, (err) => {
                                if(err){
                                    logger.error(err, 'twitter');
                                }
                                else
                                {
                                    logger.log(`Removed account '${interaction.options.getUser('user').username}' from database`, 'twitter');
                                }
                            });
                        }
                    });
    
                    db.run(`DELETE FROM tweetProfiles WHERE discordID = "${interaction.options.getUser('user').id}"`, (err) => {
                        if(err){
                            message.channel.send(':x: **Failed to remove account!**');
                            logger.error(err, 'twitter');
                            interaction.reply({
                                content: ':x: **Failed to remove account!** ```' + err + '```',
                                ephemeral: true
                            });
                        }
                        else
                        {
                            logger.log(`Removed account '${interaction.options.getUser('user').username}' from profiles`, 'twitter');
                            interaction.reply({
                                content: ':white_check_mark: **Successfully unfollowed** `' + interaction.options.getUser('user').username + '`',
                                ephemeral: true
                            });
                        }
                    });
                })
            }
        }
        else {
            interaction.reply({
                content: ":no_entry_sign: **Unauthorised**",
                ephemeral: true
            });
        }
    }
}

function formatCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function defaultBool(bool) {
    if(bool == null) {
        return false;
    } else {
        return bool.value;
    }
}