const Discord = require('discord.js');
const config = require('../config.json');

const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

module.exports = {
    name: "members",
    description: "Lists the members in the server.",
    options: [
        {
          name: 'page',
          type: 4,
          description: 'the page of members',
          required: true
        }
    ],
    /**
     * @param {KaiLogs.Logger} logger
     * @param {Discord.Interaction} interaction 
     * @param {Discord.Client} client 
     */
    async execute(logger, interaction, client) {
        if(config.discord.ownerIDs.includes(interaction.member.id)) {
            var members = [];
            db.all(`SELECT * FROM users ORDER BY username ASC`, (err, data) => {
                if(err){
                    console.log(err);
                    logger.log(err, 'commands', 'ERROR');
                }
                data.forEach((rows) => {
                    members.push(rows);
                });
    
                if(members.length == 0)
                {
                    interaction.reply({
                        content: ':x: **Currently no members!**',
                        ephemeral: true
                    });
                }
                else
                {
                    var page = interaction.options.get('page').value - 1;
                    var minNum = page * 10
                    var maxNum = minNum + 9;
    
                    if(members.length > minNum)
                    {
                        const embed = new Discord.MessageEmbed();
                        embed.setColor(config.discord.embedHex)
                        
                        if(members.length < maxNum) {
                            embed.setAuthor({ name: `Showing members #${minNum + 1} - #${members.length}` })
                        }
                        else {
                            embed.setAuthor({ name: `Showing members #${minNum + 1} - #${maxNum + 1}` })
                        }
    
                        while(maxNum >= minNum && members.length > minNum)
                        {                       
                            embed.addField(`#${minNum + 1} - ${members[minNum].username}`, `${formatCommas(members[minNum].vipProgress)} msgs/mo, ${formatCommas(members[minNum].totalMessages)} total`);
                            minNum++;
                            console.log(minNum);
                        }
    
                        embed.setFooter({ text: `Currently ${members.length} members` });
                        logger.info(`Showed ${this.name} for user '${interaction.member.displayName}' (${interaction.member.id})`);
                        interaction.reply({
                            embeds: [ embed ],
                            ephemeral: true
                        });
                    }
                    else
                    {
                        interaction.reply({
                            content: ":x: **Sorry, you don't have that many members**",
                            ephemeral: true
                        });
                    }
                }
            });
        }
        else {
            logger.info(`Unauthorized ${this.name} for user '${interaction.member.displayName}' (${interaction.member.id})`);
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