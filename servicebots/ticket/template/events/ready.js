const { REST, Routes } = require('discord.js');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`🤖 Bot is ready in ${client.guilds.cache.size} server(s)`);

        const commands = [];
        client.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

        try {
            console.log(`🔄 Registering ${commands.length} slash commands...`);
            
            for (const guild of client.guilds.cache.values()) {
                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, guild.id),
                    { body: commands }
                );
            }
            
            console.log('✅ Successfully registered slash commands!');
        } catch (error) {
            console.error('❌ Error registering commands:', error);
        }

        client.user.setActivity('tickets | /ticket-panel', { type: 3 });
    }
};
