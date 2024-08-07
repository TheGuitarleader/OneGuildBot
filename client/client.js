const host = require('../config.json').mysql;
const {Client, Collection, Intents} = require('discord.js');
const mysql = require('mysql');

module.exports = class extends Client {
  constructor(config) {
    super({
      intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS],
      partials: ['GUILD_MEMBER']
    });

    this.db = mysql.createConnection({
      host: host.host,
      user: host.user,
      password: host.password,
      database: host.database,
      charset: "utf8mb4",
      supportBigNumbers: true,
      bigNumberStrings: true
    });

    this.commands = new Collection();
    this.config = config;
  }
};