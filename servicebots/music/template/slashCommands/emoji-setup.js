const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { uploadEmojis, updateEmojiJson } = require('../utils/emojiUploader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emoji-setup')
        .setDescription('Setup all Deadloom emojis in the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addBooleanOption(option =>
            option.setName('update-json')
                .setDescription('Update the emojis.json file after upload')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        const updateJson = interaction.options.getBoolean('update-json') ?? false;
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const config = require('../config');
            
            if (!config.BOT_TOKEN) {
                return await interaction.editReply({
                    content: '❌ Bot token not configured in environment variables'
                });
            }
            
            await interaction.editReply({
                content: '⏳ Starting emoji upload process... This may take a few minutes.\n\n🔄 Downloading and uploading emojis to the server...'
            });
            
            const newEmojiIds = await uploadEmojis(interaction.guild.id, config.BOT_TOKEN);
            
            let message = `✅ Emoji setup complete!\n\n`;
            message += `**Uploaded Emojis:** ${Object.keys(newEmojiIds).length}\n\n`;
            message += `**Emoji List:**\n`;
            
            const emojiList = Object.entries(newEmojiIds)
                .slice(0, 10)
                .map(([name, emoji]) => `• ${name}: ${emoji}`)
                .join('\n');
            
            message += emojiList;
            
            if (Object.keys(newEmojiIds).length > 10) {
                message += `\n... and ${Object.keys(newEmojiIds).length - 10} more`;
            }
            
            if (updateJson) {
                await updateEmojiJson(newEmojiIds);
                message += '\n\n✅ emojis.json has been updated with new IDs';
            } else {
                message += '\n\n💡 Use `/emoji-setup update-json: true` to update the emojis.json file';
            }
            
            await interaction.editReply({
                content: message
            });
            
        } catch (error) {
            console.error('Emoji setup error:', error);
            await interaction.editReply({
                content: `❌ Error during emoji setup: ${error.message}`
            });
        }
    }
};
