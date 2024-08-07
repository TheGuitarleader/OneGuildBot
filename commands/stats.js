const Discord = require('discord.js');
const Margo = require('margojs');
const config = require('../config.json');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');

module.exports = {
    name: "stats",
    description: "Gives message stats from the server.",
    options: [
        {
            name: 'return',
            type: 3,
            description: 'The type of data to return.',
            required: true,
            choices: [
                {
                    name: 'Users',
                    value: 'users'
                },
                {
                    name: 'Channels',
                    value: 'channels'
                },
                {
                    name: 'Yearly',
                    value: 'years'
                },
                {
                    name: 'Monthly',
                    value: 'months'
                },
                {
                    name: 'Week',
                    value: 'week'
                },
                {
                    name: 'Daily',
                    value: 'days'
                },
                {
                    name: 'Hourly',
                    value: 'hours'
                },
            ]
        },
        {
            name: 'month',
            type: 4,
            description: 'Specific month to find data in number format.',
            min_value: 0,
            max_value: 12,
        },
        {
            name: 'day',
            type: 3,
            description: 'Specific day to find data.',
            min_value: 1,
            max_value: 31,
        },
        {
            name: 'weekday',
            type: 3,
            description: 'Specific weekday to find data in number format. (0=Sunday..6=Saturday)',
            min_value: 0,
            max_value: 6,
        },
        {
            name: 'year',
            type: 3,
            description: 'Specific year to find data.'
        },
        {
            name: 'hour',
            type: 3,
            description: 'Specific hour to find data in 24 hour time format.',
            min_value: 0,
            max_value: 23,
        },
        {
            name: 'minute',
            type: 3,
            description: 'Specific minute to find data.',
            min_value: 0,
            max_value: 59,
        },
        {
            name: 'days',
            type: 3,
            description: 'The number of days from today to go back for data.'
        },
        {
            name: 'user',
            type: 6,
            description: 'Get messages from a certain user.'
        },
        {
            name: 'channel',
            type: 7,
            description: 'Get messages from certain channels.'
        },
        {
            name: 'keyword',
            type: 3,
            description: 'Get messages containing a keyword.'
        },
        {
            name: 'graph',
            type: 5,
            description: 'Generates a graph of the returned data.'
        }
    ],

    // 3 - String
    // 4 - Int
    // 5 - Bool
    // 6 - Discord User
    // 7 - Discord Channel

    /**
     * @param {Margo.Logger} logger 
     * @param {Discord.Interaction} interaction 
     * @param {Discord.Client} client 
     */
    async execute(logger, interaction, client) {
        if(config.discord.ownerIDs.includes(interaction.member.id)) {
            const startMs = Date.now();

            SQLQuery(logger, interaction, client).then(rows => {    
                let dataUrl = null;
                let total_messages = 0;
                let stringData = "";
                let labels = [];
                let values = [];

                rows.forEach(r => {
                    const type = interaction.options.get('return').value;
                    if(type == 'users' || type == 'channels') {
                        if(r.value <= 0) return;
                    }

                    total_messages = parseInt(total_messages) + parseInt(r.value);
                    stringData += `${r.name}: **${formatCommas(r.value)}**\n`;
                    labels.push(r.name);
                    values.push(r.value);
                });

                (async () => {
                    const embed = new Discord.MessageEmbed();
                    const row = new Discord.MessageActionRow();
                    embed.setColor(config.discord.embedHex);

                    row.addComponents(new Discord.MessageButton().setCustomId('trash').setStyle('SECONDARY').setLabel('Create Ticket').setEmoji('🎫'));

                    if(stringData.length > 0) {
                        const title = await generateTitle(interaction);

                        embed.setTitle(title);
                        //embed.setDescription(stringData);
                        embed.setImage("attachment://graph.png");
                        const attachment = await generateCanvas(title, labels, values);

                        const durationMs = Date.now() - startMs;
                        embed.setFooter({ text: `Found ${formatCommas(total_messages)} results in ${durationMs}ms`, iconURL: client.user.avatarURL(),  });
                        
                        interaction.reply({
                            embeds: [embed],
                            files: [attachment],
                            //components: [row],
                            //ephemeral: true
                        });
                    }
                    else {
                        embed.setDescription('**:x: No data found.**');

                        interaction.reply({
                            embeds: [embed],
                            ephemeral: true
                        });
                    }
                })();
            });
        }
        else {
            interaction.reply({
                content: ":no_entry_sign: **Unauthorized**",
                ephemeral: true
            });
        }
    }
}

const SQLQuery = async (logger, interaction, client) => {

    let subSql = '';
    switch (interaction.options.get('return').value) {
        case 'users':
            subSql += `SELECT COUNT(*) FROM all_messages WHERE all_messages.user_id = dummy`;
            break;

        case 'channels':
            subSql += `SELECT COUNT(*) FROM all_messages WHERE all_messages.channel_id = dummy`;
            break;

        case 'months':
            subSql += `SELECT COUNT(*) FROM all_messages WHERE DATE_FORMAT(all_messages.sent_at, '%m') = name`;
            break;

        case 'days':
            subSql += `SELECT COUNT(*) FROM all_messages WHERE DATE_FORMAT(all_messages.sent_at, '%d') = name`;
            break;

        case 'years':
            subSql += `SELECT COUNT(*) FROM all_messages WHERE DATE_FORMAT(all_messages.sent_at, '%Y') = name`;
            break;

        case 'hours':
            subSql += `SELECT COUNT(*) FROM all_messages WHERE DATE_FORMAT(all_messages.sent_at, '%H') = name`;
            break;
    }

    const month = interaction.options.get('month');
    if(month != undefined && month != null) {
        subSql += ` AND DATE_FORMAT(sent_at, '%m') = ${month.value}`;
    }

    const day = interaction.options.get('day');
    if(day != undefined && day != null) {
        subSql += ` AND DATE_FORMAT(sent_at, '%e') = ${day.value}`;
    }

    const weekday = interaction.options.get('weekday');
    if(weekday != undefined && weekday != null) {
        subSql += ` AND DATE_FORMAT(sent_at, '%w') = ${weekday.value}`;
    }

    const year = interaction.options.get('year');
    if(year != undefined && year != null) {
        subSql += ` AND DATE_FORMAT(sent_at, '%Y') = ${year.value}`;
    }

    const hour = interaction.options.get('hour');
    if(hour != undefined && hour != null) {
        subSql += ` AND DATE_FORMAT(sent_at, '%k') = ${hour.value}`;
    }

    const minute = interaction.options.get('minute');
    if(minute != undefined && minute != null) {
        subSql += ` AND DATE_FORMAT(sent_at, '%i') = ${minute.value}`;
    }

    const days = interaction.options.get('days');
    if(days != undefined && days != null) {
        subSql += ` AND sent_at >= now() - INTERVAL ${days.value} DAY`;
    }

    const user = interaction.options.getUser('user');
    if(user != undefined && user != null) {
        subSql += ` AND user_id = ${user.id}`;
    }

    const channel = interaction.options.getChannel('channel');
    if(channel != undefined && channel != null) {
        subSql += ` AND channel_id = ${channel.id}`;
    }

    const keyword = interaction.options.get('keyword');
    if(keyword != undefined && keyword != null) {
        subSql += ` AND all_messages.msg_content LIKE "% ${keyword.value}%"`;
    }

    let mainSql = '';
    switch (interaction.options.get('return').value) {
        case 'users':
            mainSql += `SELECT user_name as name, user_id as dummy, (${subSql}) as value FROM all_messages GROUP BY user_id ORDER BY value DESC;`;
            break;

        case 'channels':
            mainSql += `SELECT channel_name as name, channel_id as dummy, (${subSql}) as value FROM all_messages GROUP BY channel_id ORDER BY value DESC;`;
            break;

        case 'months':
            mainSql += `SELECT DATE_FORMAT(sent_at, '%m') as name, (${subSql}) as value FROM all_messages GROUP BY name ORDER BY name ASC;`;
            break;

        case 'days':
            mainSql += `SELECT DATE_FORMAT(sent_at, '%d') as name, (${subSql}) as value FROM all_messages GROUP BY name ORDER BY name ASC;`;
            break;

        case 'years':
            mainSql += `SELECT DATE_FORMAT(sent_at, '%Y') as name, (${subSql}) as value FROM all_messages GROUP BY name ORDER BY name ASC;`;
            break;

        case 'hours':
            mainSql += `SELECT DATE_FORMAT(sent_at, '%H') as name, (${subSql}) as value FROM all_messages GROUP BY name ORDER BY name ASC;`;
            break;
    }

    //mainSql += ' LIMIT 10';

    console.log(`Main SQL -> ${mainSql}`);
    console.log(`Sub SQL -> ${subSql}`);

    return new Promise((res, rej) => {
        client.db.query(mainSql, (err, rows) => {
            if(err) {
                rej(err)
            }

            res(rows);
        });
    })
};

const generateCanvas = async (title, labels, values) => {
    const renderer = new ChartJSNodeCanvas({ width: 1280, height: 720, backgroundColour: '#242526' });
    const image = await renderer.renderToBuffer({
      // Build your graph passing option you want
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: title,
            data: values,
            borderColor: config.discord.embedHex,
            //backgroundColor: config.discord.embedHex,
            fill: true,
            tension: 0.2,
          }
        ],
        options: {
            title: {
                display: true,
                text: title
            }
        }
      },
    });

    fs.writeFile('graph.png', image, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });

    return new Discord.MessageAttachment(image, "graph.png");
};

async function generateTitle(interaction) {
    let title = '';

    switch (interaction.options.get('return').value) {
        case 'users':
            title += 'User Message Counts';
            break;

        case 'channels':
            title += 'Channel Message Counts';
            break;

        case 'months':
            title += 'Monthly Message Counts';
            break;

        case 'days':
            title += 'Daily Message Counts';
            break;

        case 'years':
            title += 'Yearly Message Counts';
            break;
        
        case 'hours':
            title += 'Hourly Message Counts';
            break;
    }

    const month = interaction.options.get('month');
    const day = interaction.options.get('day');
    if(month != undefined && month != null && day != undefined && day != null) {
        title += ` On ${GetMonth(month.value)} ${day.value}`;
    }
    else if(month != undefined && month != null) {
        title += ` In The Month of ${GetMonth(month.value)}`;
    }

    const weekday = interaction.options.get('weekday');
    if(weekday != undefined && weekday != null) {
        title += ` On A ${getWeekday(weekday.value)}`;
    }

    const year = interaction.options.get('year');
    if(year != undefined && year != null) {
        title += ` In The Year ${year.value}`;
    }

    const days = interaction.options.get('days');
    if(days != undefined && days != null) {
        title += ` In The Last ${days.value} Days`;
    }

    const user = interaction.options.getUser('user');
    if(user != undefined && user != null) {
        title += ` From User '${user.username}'`;
    }

    const channel = interaction.options.getChannel('channel');
    if(channel != undefined && channel != null) {
        title += ` In Channel '${channel.name}'`;
    }

    const keyword = interaction.options.get('keyword');
    if(keyword != undefined && keyword != null) {
        title += ` Related To The Word '${keyword.value}'`;
    }

    return title;
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

function GetMonth(num) {
    let months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

    let index = num -1;

    if(index < 0) {
        index = 12
    }
    else if(index > 12) {
        index = 0
    }

    return months[index];
}

function getWeekday(num) {
    let weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdays[num];
}