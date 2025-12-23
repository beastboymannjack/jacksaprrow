const Discord = require('discord.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "testnotif",
    description: "Test the bot expiration notification system",
    usage: "testnotif <userId>",
    
    run: async (client, message, args) => {
        // Only allow owner
        if (message.author.id !== process.env.BOT_OWNER_ID) {
            return message.reply("❌ You don't have permission to use this command.");
        }
        
        if (!args[0]) {
            return message.reply("Usage: `,testnotif <userId>`");
        }
        
        const userId = args[0];
        
        try {
            const user = await client.users.fetch(userId);
            
            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('🚨 Bot Expiration Notice')
                .setDescription('This is a test notification from the bot expiration system.')
                .addFields(
                    { name: 'Bot Name', value: 'Test Bot - Notification System' },
                    { name: 'Expired At', value: new Date().toLocaleString() }
                )
                .setFooter({ text: 'Your bot has been automatically stopped' });
            
            await user.send({ embeds: [embed] });
            message.reply(`✅ Test notification sent to <@${userId}>!`);
        } catch (err) {
            message.reply(`❌ Failed to send test notification: ${err.message}`);
        }
    }
};
