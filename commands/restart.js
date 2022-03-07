const config = require('../config.json');

module.exports = {
    name: "restart",
    description: "Restarts the bot (Dev only)",
    async execute(logger, interaction, client) {
        if (config.discord.ownerIDs.includes(interaction.member.id))
        {
            interaction.reply({
                content: ":white_check_mark: **Restarting...**",
                ephemeral: true
            }).then(msg => {
                process.exit();
            })
        }
        else
        {
            interaction.reply({
                content: ":no_entry_sign: **Unauthorized**",
                ephemeral: true
            })
        }
    }
}