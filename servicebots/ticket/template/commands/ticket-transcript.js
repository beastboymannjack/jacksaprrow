const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-transcript')
        .setDescription('Generate and download ticket transcript')
        .addStringOption(option =>
            option
                .setName('format')
                .setDescription('Export format')
                .setRequired(false)
                .addChoices(
                    { name: 'Text File', value: 'txt' },
                    { name: 'HTML File', value: 'html' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction, client) {
        const ticket = client.database.getTicket(interaction.guild.id, interaction.channel.id);
        
        if (!ticket) {
            return interaction.reply({
                content: '❌ This command can only be used in ticket channels.',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const format = interaction.options.getString('format') || 'txt';
        
        try {
            const serverConfig = client.database.getServerConfig(interaction.guild.id);
            const customCategories = serverConfig.customCategories || {};
            
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            const sortedMessages = Array.from(messages.values())
                .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            let transcriptContent;
            const fileName = `ticket-${ticket.type}-${interaction.channel.name}-${Date.now()}`;

            if (format === 'html') {
                transcriptContent = generateHTMLTranscript(sortedMessages, ticket, interaction.guild, customCategories);
            } else {
                transcriptContent = generateTextTranscript(sortedMessages, ticket, interaction.guild, customCategories);
            }

            client.database.saveTranscript(
                interaction.guild.id,
                interaction.channel.id,
                sortedMessages.map(m => ({
                    author: m.author.tag,
                    content: m.content,
                    timestamp: m.createdTimestamp,
                    attachments: m.attachments.map(a => a.url)
                }))
            );

            const buffer = Buffer.from(transcriptContent, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { 
                name: `${fileName}.${format}` 
            });

            await interaction.editReply({
                content: `✅ Transcript generated successfully! (${sortedMessages.length} messages)`,
                files: [attachment]
            });

        } catch (error) {
            console.error('Transcript error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while generating the transcript.'
            });
        }
    }
};

function generateTextTranscript(messages, ticket, guild, customCategories = {}) {
    const allCategories = { ...config.ticketCategories, ...customCategories };
    let transcript = '='.repeat(60) + '\n';
    transcript += `TICKET TRANSCRIPT - ${guild.name}\n`;
    transcript += '='.repeat(60) + '\n';
    transcript += `Ticket Type: ${allCategories[ticket.type]?.label || ticket.type}\n`;
    transcript += `Created: ${new Date(ticket.createdAt).toLocaleString()}\n`;
    transcript += `Status: ${ticket.status}\n`;
    transcript += `User: ${ticket.username}\n`;
    transcript += `Reason: ${ticket.reason}\n`;
    transcript += `Description: ${ticket.description}\n`;
    transcript += '='.repeat(60) + '\n\n';

    messages.forEach(msg => {
        const timestamp = new Date(msg.createdTimestamp).toLocaleString();
        transcript += `[${timestamp}] ${msg.author.tag}:\n`;
        transcript += `${msg.content || '[No text content]'}\n`;
        
        if (msg.attachments.size > 0) {
            transcript += 'Attachments:\n';
            msg.attachments.forEach(att => {
                transcript += `  - ${att.url}\n`;
            });
        }
        transcript += '\n';
    });

    transcript += '='.repeat(60) + '\n';
    transcript += 'END OF TRANSCRIPT\n';
    transcript += '='.repeat(60);

    return transcript;
}

function generateHTMLTranscript(messages, ticket, guild, customCategories = {}) {
    const allCategories = { ...config.ticketCategories, ...customCategories };
    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ticket Transcript - ${guild.name}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #36393f; color: #dcddde; padding: 20px; }
        .header { background: #202225; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #5865F2; }
        .info { margin: 10px 0; }
        .message { background: #2f3136; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 3px solid #5865F2; }
        .author { color: #5865F2; font-weight: bold; }
        .timestamp { color: #72767d; font-size: 0.85em; }
        .content { margin-top: 8px; }
        .attachment { color: #00b0f4; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎫 Ticket Transcript</h1>
        <div class="info"><strong>Server:</strong> ${guild.name}</div>
        <div class="info"><strong>Type:</strong> ${allCategories[ticket.type]?.label || ticket.type}</div>
        <div class="info"><strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}</div>
        <div class="info"><strong>User:</strong> ${ticket.username}</div>
        <div class="info"><strong>Reason:</strong> ${ticket.reason}</div>
        <div class="info"><strong>Description:</strong> ${ticket.description}</div>
    </div>
    <div class="messages">`;

    messages.forEach(msg => {
        const timestamp = new Date(msg.createdTimestamp).toLocaleString();
        html += `
        <div class="message">
            <div><span class="author">${escapeHtml(msg.author.tag)}</span> <span class="timestamp">${timestamp}</span></div>
            <div class="content">${escapeHtml(msg.content) || '<em>[No text content]</em>'}</div>`;
        
        if (msg.attachments.size > 0) {
            html += '<div class="attachments">';
            msg.attachments.forEach(att => {
                html += `<div class="attachment">📎 <a href="${att.url}">${att.name}</a></div>`;
            });
            html += '</div>';
        }
        
        html += '</div>';
    });

    html += `
    </div>
    <div style="text-align: center; margin-top: 30px; color: #72767d;">
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;

    return html;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
