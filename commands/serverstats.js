const Discord = require('discord.js');
const Margo = require('margojs');
const config = require('../config.json');

module.exports = {
    name: "counts",
    description: "Message counts",
    options: [
        {
          name: 'days',
          type: 4,
          description: 'How many days from today',
          required: true
        }
    ],

    // 3 - String
    // 4 - Int
    // 5 - Bool
    // 6 - Discord User

    /**
     * @param {Margo.Logger} logger 
     * @param {Discord.Interaction} interaction 
     * @param {Discord.Client} client 
     */
    async execute(logger, interaction, client) {
        if(config.discord.ownerIDs.includes(interaction.member.id)) {
            const type = interaction.options.get('type').value;
            if(type == 'message') {
                db.all(`SELECT * FROM users ORDER BY vipProgress DESC`, (err, rows1) => {

                    let allUsers = [];
                    let activeUsers = [];
                    let totalMessages = 0;
                    let monthMessages = 0;
                    let activeMessages = 0;
                    let prevMonthAmounts = [];
                    let prevMonthTotal = 0;
        
                    if(rows1 != undefined) {
                        rows1.forEach((row) => {
                            allUsers.push(row);
                            totalMessages = totalMessages + row.totalMessages;
                            if(row.vipProgress >= 8) {
                                activeUsers.push(row.vipProgress);
                                activeMessages = activeMessages + row.totalMessages;
                                monthMessages = monthMessages + row.vipProgress;
                            }
                        });
        
                        db.all(`SELECT * FROM messageHistory WHERE month = "${GetMonth(-1)}"`, (err, rows2) => {
                            console.log(rows2);
                            if(rows2 != null) {
                                rows2.forEach((row) => {
                                    prevMonthAmounts.push(row.amount);
                                    prevMonthTotal = prevMonthTotal + row.amount;
                                });
            
                                client.guilds.fetch(config.discord.guildID).then((guild) => {
                                    const embed = new Discord.MessageEmbed()
                                    .setColor(config.discord.embedHex)
                                    .setTitle(":earth_americas:  Server Message Stats")
                                    .setDescription('Stats are calculated off of member activity. Activity \nis calculated off of if the member has sent more \nthen 2 messages a week in the month.')
                                    .addFields(
                                        { name: ':wave: Active Members:', value: `Active: ${formatCommas(activeUsers.length)}, Total: ${formatCommas(guild.memberCount)} (${findPercents(activeUsers.length, guild.memberCount)})`},
                                        { name: ':pencil: Total Messages:', value: `Active: ${formatCommas(activeMessages)}, Total: ${formatCommas(totalMessages)} (${findPercents(activeMessages, totalMessages)})`},
                                        { name: ':incoming_envelope: Average Messages Sent:', value: `This month: ${findAverage(activeUsers)}, Last month: ${findAverage(prevMonthAmounts)} (${findPercentChange(findAverage(prevMonthAmounts), findAverage(activeUsers))})`},
                                        { name: ':envelope: Monthly Messages Sent:', value: `This month: ${formatCommas(monthMessages)}, Last month: ${formatCommas(prevMonthTotal)} (${findPercentChange(prevMonthTotal, monthMessages)})`},
                                        { name: `:first_place: : ${allUsers[0].username}`, value: `Messages: ${allUsers[0].vipProgress} (${findPercents(allUsers[0].vipProgress, activeMessages)})`},
                                        { name: `:second_place: : ${allUsers[1].username}`, value: `Messages: ${allUsers[1].vipProgress} (${findPercents(allUsers[1].vipProgress, activeMessages)})`},
                                        { name: `:third_place: : ${allUsers[2].username}`, value: `Messages: ${allUsers[2].vipProgress} (${findPercents(allUsers[2].vipProgress, activeMessages)})`},
                                    )
                                    .setFooter({ text: guild.name, iconURL: guild.iconURL() });
                                    
                                    logger.info(`Showed ${this.name} for user '${interaction.member.displayName}' (${interaction.member.id})`);
                                    interaction.reply({
                                        embeds: [embed]
                                    });
                                });
                            }
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

function findPercents(part, whole) {
    let quotient = parseInt(part) / parseInt(whole);
    return (quotient * 100).toFixed(1) + "%";
}

function findPercentChange(v1, v2) {
    let value1 = parseInt(v1);
    let value2 = parseInt(v2);

    let quotient = (value2 - value1) / value1;
    let finalValue = (quotient * 100).toFixed(1);
    if(finalValue > 0) {
        return `+${finalValue}%`;
    }
    else {
        return `${finalValue}%`;
    }
}

function findAverage(array) {
    let total = 0;
    array.forEach((a) => {
        let value = parseInt(a);
        total = total + value;
    });

    return Math.round((total / array.length));
}

function FormatDate() {
    var d = new Date(Date.now());
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