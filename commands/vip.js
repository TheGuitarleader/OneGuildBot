const Discord = require('discord.js');
const config = require('../config.json');
const addToVips = require('../functions/addToVips');

const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

module.exports = {
    name: "vip",
    description: "Overrides vips",
    options: [
        {
          name: 'type',
          type: 3,
          description: 'The type of action',
          required: true,
          choices: [
            {
                name: 'Add VIP',
                value: 'add'
            },
            {
                name: 'Remove VIP',
                value: 'remove'
            }
          ]
        },
        {
            name: 'user',
            type: 6,
            description: 'The discord user of the Twitch account.',
            required: true
        },
        {
            name: 'days',
            type: 4,
            description: 'The duration the user is VIP',
            required: true
        },
    ],
    async execute(logger, interaction, client) {
        if(config.discord.ownerIDs.includes(interaction.member.id)) {
            var type = interaction.options.get('type').value;
            if(type == 'add') {
                interaction.guild.members.fetch(interaction.options.getUser('user').id).then((member) => {
                    client.channels.fetch(config.discord.vip_ch).then((channel) => {
                        addToVips(logger, member, channel, interaction.options.get('days').value);
                        interaction.reply({
                            content: `:white_check_mark: **Added '${member.displayName}' to VIPs!**`,
                            ephemeral: true
                        });
                    });
                });                              
            }
            else if(type == 'remove') {
                interaction.guild.members.fetch(interaction.options.getUser('user').id).then((member) => {
                    member.roles.remove(member.guild.roles.cache.find(r => r.name === "VIP"));

                    db.serialize(() => {
                        db.run(`DELETE FROM vips WHERE discordID = "${member.user.id}"`, function(err) {
                            if(err) {
                                logger.error(err);
                            }
                            else {
                                logger.info(`Removed VIP '${member.displayName}' (${member.user.id})`);
                                interaction.reply({
                                    content: `:white_check_mark: **Removed '${member.displayName}' from VIPs!**`,
                                    ephemeral: true
                                });
                            }
                        });

                        db.run(`UPDATE users SET isVIP = "false" WHERE discordID = "${member.user.id}"`, function(err) {
                            if(err) {
                                logger.error(err);
                            }
                            else {
                                logger.info(`Reset '${member.displayName}' (${member.user.id}) VIP progress`)
                            }
                        });
                    })
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