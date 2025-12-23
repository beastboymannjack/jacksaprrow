const { REST, Routes } = require('discord.js');

module.exports = {
    name: 'guildCreate',
    async execute(guild, client) {
        console.log(`✅ Bot joined new server: ${guild.name} (${guild.id})`);
        console.log(`👥 Server has ${guild.memberCount} members`);

        const commands = [];
        client.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

        try {
            console.log(`🔄 Registering ${commands.length} slash commands for ${guild.name}...`);
            
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guild.id),
                { body: commands }
            );
            
            console.log(`✅ Successfully registered slash commands for ${guild.name}!`);
        } catch (error) {
            console.error(`❌ Error registering commands for ${guild.name}:`, error);
        }
    }
};
