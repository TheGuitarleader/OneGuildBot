const Discord = require('discord.js');
const KaiLogs = require('kailogs');
const config = require('../config.json');
const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./data.db');
var _ = require("lodash");

/**
 * 
 * @param {KaiLogs.Logger} logger 
 * @param {Discord.Interaction} interaction 
 */
module.exports = function(logger, interaction) {
    var dice = _.sortBy(_.times(5, function() {
        return _.random(1,6);
    }, function(a, b) {
        return a - b;
    }));

    //let dice = [ getRndInt(), getRndInt(), getRndInt(), getRndInt(), getRndInt() ];

    let format = `Numbers are: `;
    dice.forEach((die) => {
        format += ` ${die},`
    });
    let title = format.slice(0, -1);

    var freq = [0,0,0,0,0,0];
    dice.forEach(function(r) {
        freq[r-1]++;
    });
    freq = _.sortBy(_.compact(freq), function(a, b) {
        return a - b;
    });

    console.log(dice);
    console.log(freq);

    var ruling;

    if (freq.length == 1) {
        ruling = "Yahtzee! (100 points!)"
        addPointsToDB(logger, interaction, 100);
    } else if (freq.length == 2) {
        ruling = freq[0] == 2 ? "Full House! (25 points)" : "Four of a Kind! (30 points)";
    } else if (freq.length == 3 && freq[2] == 3) {
        ruling = "Three of a Kind! (30 points)";
        addPointsToDB(logger, interaction, 30);
    } else if (freq.length == 4 && isSequential(_.uniq(dice))) {
        ruling = "Small Straight! (30 points)";
        addPointsToDB(logger, interaction, 30);
    } else if (freq.length == 5 && isSequential(dice)) {
        ruling = "Large Straight! (50 points)";
        addPointsToDB(logger, interaction, 50);
    } else {
        let best = getMostFrequent(dice);
        console.log(best);
        if(best == 1) {
            ruling = 'Ones (5 points)';
            addPointsToDB(logger, interaction, 5);
        }
        else if(best == 2) {
            ruling = 'Twos (10 points)';
            addPointsToDB(logger, interaction, 10);
        }
        else if(best == 3) {
            ruling = 'Threes (15 points)';
            addPointsToDB(logger, interaction, 15);
        }
        else if(best == 4) {
            ruling = 'Fours (20 points)';
            addPointsToDB(logger, interaction, 20);
        }
        else if(best == 5) {
            ruling = 'Fives (25 points)';
            addPointsToDB(logger, interaction, 25);
        }
        else if(best == 6) {
            ruling = 'Sixes (30 points)';
            addPointsToDB(logger, interaction, 30);
        }
    }

    const embed = new Discord.MessageEmbed()
    .setColor(config.discord.embedHex)
    .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.avatarURL() })
    .setTitle(title)
    .setDescription(`**${ruling}**`)

    interaction.reply({
        embeds: [ embed ]
    });
}

function addPointsToDB(logger, interaction, points) {
    db.serialize(() => {
        db.run(`INSERT OR IGNORE INTO diceRollPoints VALUES("${interaction.user.id}", "${interaction.member.displayName}", 0)`, (err) => {
            if(err) {
                logger.error(err);
            }
        });

        db.run(`UPDATE diceRollPoints SET points = points + ${points} WHERE discordID = "${interaction.user.id}"`, (err) => {
            if(err) {
                logger.error(err);
            }
        });
    });
}

function getRndInt() {
    let number = Math.floor(Math.random() * Math.floor(5))
    return number;
};

function getMostFrequent(arr) {
    const hashmap = arr.reduce( (acc, val) => {
     acc[val] = (acc[val] || 0 ) + 1
     return acc
  }, {})
 return Object.keys(hashmap).reduce((a, b) => hashmap[a] > hashmap[b] ? a : b)
}

function isSequential(array) {
    for (var i = 1; i < array.length; i++) {
        if (array[i] - array[i-1] != 1) {
            return false;
        }
    }
    return true;
}