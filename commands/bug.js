const Discord = require('discord.js');
const config = require('../config.json');
const package = require('../package.json');
const request = require('request');

module.exports = {
    name: "bug",
    description: "Links to the bug tracker.",
    async execute(logger, interaction, client) {
        var options = {
            url: 'https://api.github.com/repos/TheGuitarleader/OneGuildBot/issues?state=all',
            headers: {
              'User-Agent': 'theguitarleader'
            }
        };

        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                var activeBugs = 0;
                var fixedBugs = 0;
                var featureRequests = 0;

                var info = JSON.parse(body);

                console.log(info);

                info.forEach((issue) => {
                    console.log(issue);
                    if(issue.state == "open") {
                        issue.labels.forEach((label) => {
                            if(label.name == "Bug") {
                                activeBugs++;
                            }
                            else if(label.name == "Feature Request") {
                                featureRequests++;
                            }
                        });
                    }

                    if(issue.state == "closed") {
                        issue.labels.forEach((label) => {
                            if(label.name == "Patched") {
                                fixedBugs++;
                            }
                        });
                    }
                });

                const embed = new Discord.MessageEmbed()
                .setColor(config.discord.embedHex)
                .setTitle(`One Guild Bug Tracker`)
                .setThumbnail(interaction.client.user.avatarURL())
                .setDescription(`This helps us keep track of bugs and possible \nthings to add to make the bot even better!\n
                To submit a issue or something to add:
                - Click the link above.
                - Fill out the title and add a brief description.
                - Add the necessary label if its a bug or a feature.`)
                .addField("Features Submitted", featureRequests.toString(), false)
                .addField("Known Bugs", activeBugs.toString(), true)
                .addField("Bugs Fixed", fixedBugs.toString(), true)
                .setURL("https://github.com/TheGuitarleader/OneGuildBot/issues/new")
                .setFooter({ text: 'Powered By Quentin' });
                interaction.reply({embeds: [embed] });
                logger.info(`Showed ${this.name} for user '${interaction.member.displayName}' (${interaction.member.id})`);
            }
        }
          
        request(options, callback);
    }
}