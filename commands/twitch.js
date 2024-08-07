const Discord = require('discord.js');
const config = require('../config.json');
const HelixAPI = require('simple-helix-api');

const Twitch = new HelixAPI({
    access_token: config.twitch.access_token,
    client_id: config.twitch.client_id,
    redirect_url: "http://localhost"
});

module.exports = {
    name: "twitch",
    description: "Configures twitch notifications.",
    options: [
        {
          name: 'type',
          type: 3,
          description: 'The type of action',
          required: true,
          choices: [
            {
                name: 'Add new user',
                value: 'add'
            },
            {
                name: 'Remove user',
                value: 'remove'
            }
          ]
        },
        {
            name: 'twitch_name',
            type: 3,
            description: 'The name of the user',
            required: true
        },
        {
            name: 'user',
            type: 6,
            description: 'The discord user of the Twitch account.',
            required: true
        },
        {
            name: 'channel',
            type: 7,
            description: 'The channel for live notifications'
        }
    ],
    async execute(logger, interaction, client) {
        if(config.discord.ownerIDs.includes(interaction.member.id)) {
            var type = interaction.options.get('type').value;
            if(type == 'add') {
                await Twitch.users.getByLogin(interaction.options.get('twitch_name').value).then((user) => {
                    if(user != undefined && user.id != undefined && user.display_name != undefined) {
                        db.run(`INSERT INTO twitch_users VALUES("${user.id}", "${user.display_name}", "${getChannelID(interaction.options.getChannel('channel'))}", "${interaction.options.getUser('user').id}", "${interaction.options.getUser('user').username}", "online", 0, null)`, (err) => {
                            if(err){
                                logger.warn(err);
                                interaction.reply({
                                    content: ':x: `' + user.display_name + '`** is already being followed!** ```' + err + '```',
                                    ephemeral: true
                                });
                            }
                            else
                            {
                                logger.info(`Followed new account '${user.display_name}' (${user.id})`);

                                const embed = new Discord.MessageEmbed()
                                .setColor("9146FF")
                                .setAuthor({ name: user.display_name, iconURL: user.profile_image_url, url: `https://twitch.tv/${user.login}` })
                                .setDescription(user.description)
                                .setImage(user.offline_image_url)
                                .addField("Type", "`" + user.broadcaster_type + "`", true)
                                .addField("Views", formatCommas(user.view_count), true)
                                .setFooter({ text: 'Powered By Quentin' })
  
                                interaction.reply({
                                    content: ':white_check_mark: **Successfully started following `' + user.display_name + '`.** ',
                                    embeds: [ embed ],
                                    ephemeral: true
                                });
                            }
                        });
                    }
                    else {
                        logger.warn(`No results for search: '${interaction.options.get('twitch_name').value}'`);
                        interaction.reply({
                            content: ":x: **Could not find a account called** `" + interaction.options.get('twitch_name').value + "`",
                            ephemeral: true
                        });
                    }
                });
            }
            else if(type == 'remove') {
                db.run(`DELETE FROM twitchAccounts WHERE discordID = "${interaction.options.getUser('user').id}"`, (err) => {
                    if(err){
                        logger.warn(err);
                        interaction.reply({
                            content: ':x: **Failed to remove account!** ```' + err + '```',
                            ephemeral: true
                        });
                    }
                    else
                    {
                        logger.info(`Removed account '${interaction.options.getUser('user').username}' from profiles`);
                        interaction.reply({
                            content: ':white_check_mark: **Successfully unfollowed** `' + interaction.options.getUser('user').username + '`',
                            ephemeral: true
                        });
                    }
                });
            }
        }
        else {
            interaction.reply({
                content: ":no_entry_sign: **Unauthorized**",
                ephemeral: true
            });
        }
    }
}

function formatCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getChannelID(channel) {
    if(channel != null && channel != undefined) {
        return channel.id;
    }
    else {
        return config.discord.live_ch;
    }
}