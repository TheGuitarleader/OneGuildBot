const Discord = require('discord.js');
const config = require('../config.json');

const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');

module.exports = {
    name: "vips",
    description: "Lists the vips",
    options: [
        {
          name: 'page',
          type: 4,
          description: 'the page of vips',
          required: true
        }
    ],
    async execute(logger, interaction, client) {
        if(config.discord.ownerIDs.includes(interaction.member.id)) {
            var vips = [];
            db.all(`SELECT * FROM vips ORDER BY username ASC`, (err, data) => {
                if(err){
                    console.log(err);
                    logger.error(err);
                }
                data.forEach((rows) => {
                    vips.push(rows);
                });
    
                if(vips.length == 0)
                {
                    interaction.reply({
                        content: ':x: **Currently no VIPs!**',
                        ephemeral: true
                    });
                }
                else
                {
                    var page = interaction.options.get('page').value - 1;
                    var minNum = page * 10
                    var maxNum = minNum + 9;
    
                    if(vips.length > minNum)
                    {
                        const embed = new Discord.MessageEmbed();
                        embed.setColor(config.discord.embedHex)
                        
                        if(vips.length < maxNum) {
                            embed.setAuthor({ name: `Showing vips #${minNum + 1} - #${vips.length}` })
                        }
                        else {
                            embed.setAuthor({ name: `Showing vips #${minNum + 1} - #${maxNum + 1}` })
                        }
    
                        while(maxNum >= minNum && vips.length > minNum)
                        {                       
                            embed.addField(vips[minNum].username, '`' + vips[minNum].expireDate + '`');
                            minNum++;
                            console.log(minNum);
                        }
    
                        embed.setFooter({ text: `Currently ${vips.length} VIPs` });
                        logger.info(`Showed ${this.name} for user '${interaction.member.displayName}' (${interaction.member.id})`);
                        interaction.reply({
                            embeds: [ embed ],
                            ephemeral: true
                        });
                    }
                    else
                    {
                        logger.info(`Showed ${this.name} for user '${interaction.member.displayName}' (${interaction.member.id})`);
                        interaction.reply({
                            content: ":x: **Sorry, you don't have that many VIPs**",
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