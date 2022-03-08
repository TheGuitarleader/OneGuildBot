const Discord = require('discord.js');
const config = require('../config.json');

module.exports = function OnNewTweet(logger, tweet, client, db, users) {
    if(users.includes(tweet.user.id_str))
    {
        //logger.log(`Verified tweet: '@${tweet.user.screen_name}' (${tweet.user.id_str})`, 'twitter');
        logger.info(`Received tweet: '@${tweet.user.screen_name}' (https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str})`);
        db.get(`SELECT * FROM tweetProfiles WHERE accountID = ?`, [tweet.user.id_str], (err, profile) => {
            if(err)
            {
                logger.error(`Database returned error: '${err}'`)
            }
            else
            {
                if(tweet.retweeted_status != undefined && profile.showRetweets == "true")
                {
                    displayTweet(logger, tweet, profile.channelID, client);
                }
                else if(tweet.in_reply_to_status_id != null && profile.showReplies == "true")
                {
                    displayTweet(logger, tweet, profile.channelID, client);
                }
                else if(tweet.in_reply_to_status_id == null && tweet.retweeted_status == undefined)
                {
                    displayTweet(logger, tweet, profile.channelID, client);
                }
            }
        });
    }
};

// function displayTweet(tweet, channel, client) {
//     const embed = new Discord.MessageEmbed();
//     embed.setColor(tweet.user.profile_link_color)

//     // Set user
//     if(tweet.retweeted_status != undefined) {
//         embed.setAuthor({ name: `${tweet.user.name} retweeted`, url: 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str, iconURL: tweet.user.profile_image_url });
//         embed.setTitle(`${tweet.retweeted_status.user.name} (@ ${tweet.retweeted_status.user.screen_name})`);
//     }
//     else if(tweet.in_reply_to_status_id != null) {
//         embed.setAuthor({ name: `${tweet.user.name} replying to`, url: 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str, iconURL: tweet.user.profile_image_url });
//     }
//     else if(tweet.in_reply_to_status_id == null && tweet.retweeted_status == undefined) {
//         embed.setAuthor({ name: `${tweet.user.name} (@${tweet.user.screen_name})`, url: 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str, iconURL: tweet.user.profile_image_url });
//     }

//     // Set description
//     if(tweet.retweeted_status != undefined) {
//         //embed.setDescription(tweet.retweeted_status.text);
//         embed.setDescription(changeHTMLCharacters(tweet.retweeted_status.text));
//     }
//     else if(tweet.extended_tweet != undefined) {
//         //embed.setDescription(tweet.extended_tweet.full_text);
//         embed.setDescription(changeHTMLCharacters(tweet.extended_tweet.full_text));
//     }
//     else {
//         embed.setDescription(tweet.text);
//         embed.setDescription(changeHTMLCharacters(tweet.text));
//     }

//     // Set image if there is one
//     if(tweet.extended_entities != undefined)
//     {
//         embed.setImage(tweet.extended_entities.media[0].media_url)
//     }
//     else if(tweet.retweeted_status != undefined && tweet.retweeted_status.extended_entities != undefined)
//     {
//         embed.setImage(tweet.retweeted_status.extended_entities.media[0].media_url)
//     }

//     if(tweet.retweeted_status != undefined) {
//         embed.addField("Following", formatCommas(tweet.retweeted_status.user.friends_count).toString(), true);
//         embed.addField("Followers", formatCommas(tweet.retweeted_status.user.followers_count).toString(), true);
//     }
//     else {
//         embed.addField("Following", formatCommas(tweet.user.friends_count).toString(), true);
//         embed.addField("Followers", formatCommas(tweet.user.followers_count).toString(), true);
//     }
    
//     embed.setFooter({ text: 'Powered By Tweeter' })
//     client.channels.cache.get(channel).send({embeds: [embed]});
//     logger.log(`Forwarding tweet from '${tweet.user.screen_name}' to '${client.channels.cache.get(profile.channelID).name}' ->`, 'twitter');
// }



function displayTweet(tweet, channel, client) {
    const embed = new Discord.MessageEmbed();
    embed.setColor(tweet.user.profile_link_color)

    if(tweet.extended_entities != undefined)
    {
        embed.setImage(tweet.extended_entities.media[0].media_url)

        if(tweet.retweeted_status != undefined) {
            embed.setAuthor({ name: `${tweet.user.name} retweeted`, url: 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str, iconURL: tweet.user.profile_image_url });
            embed.setTitle(`${tweet.retweeted_status.user.name} (@ ${tweet.retweeted_status.user.screen_name})`);
        }
        else if(tweet.in_reply_to_status_id != null) {
            embed.setAuthor({ name: `${tweet.user.name} replying to`, url: 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str, iconURL: tweet.user.profile_image_url });
        }
        else if(tweet.in_reply_to_status_id == null && tweet.retweeted_status == undefined) {
            embed.setAuthor({ name: `${tweet.user.name} (@${tweet.user.screen_name})`, url: 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str, iconURL: tweet.user.profile_image_url });
        }
    
        // Set description
        if(tweet.retweeted_status != undefined) {
            embed.setDescription(changeHTMLCharacters(tweet.retweeted_status.text));
        }
        else if(tweet.extended_tweet != undefined) {
            embed.setDescription(changeHTMLCharacters(tweet.extended_tweet.full_text));
        }
        else {
            embed.setDescription(tweet.text);
            embed.setDescription(changeHTMLCharacters(tweet.text));
        }
    
        if(tweet.retweeted_status != undefined) {
            embed.addField("Following", formatCommas(tweet.retweeted_status.user.friends_count).toString(), true);
            embed.addField("Followers", formatCommas(tweet.retweeted_status.user.followers_count).toString(), true);
        }
        else {
            embed.addField("Following", formatCommas(tweet.user.friends_count).toString(), true);
            embed.addField("Followers", formatCommas(tweet.user.followers_count).toString(), true);
        }
        
        embed.setFooter({ text: 'Powered By Tweeter' });
        client.channels.cache.get(channel).send({embeds: [embed]});
        logger.info(`Forwarding tweet from '${tweet.user.screen_name}' to '${client.channels.cache.get(channel).name}' ->`);
    }
    else
    {
        logger.info(`Ignoring tweet from '${tweet.id_str}'`);
    }
}



function formatCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function changeHTMLCharacters(text) {
    let tweetArray = text.split(' ');
    let formatTweet = "";

    console.log(tweetArray);

    tweetArray.forEach((word) => {
        word = word.replace("&amp;","&");
        word = word.replace("&lt;","<");
        word = word.replace("&gt;",">");

        formatTweet += word + " ";
    });
    
    return formatTweet;
}