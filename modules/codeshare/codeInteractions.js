const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const codeDB = require('./codeDatabase');
const emoji = require('../../emoji.json');
const https = require('https');
const http = require('http');

module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const [action, subAction, codeId] = interaction.customId.split('_');
        
        if (action !== 'code') return;

        const code = codeDB.getCodeById(codeId);
        if (!code) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.crossred || '❌'} This code share no longer exists.`)
                ],
                ephemeral: true
            });
        }

        switch (subAction) {
            case 'view':
                return handleViewCode(interaction, code, client);
            case 'download':
                return handleDownload(interaction, code, client);
            case 'star':
                return handleStar(interaction, code, client);
        }
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'order_info_pricing') {
            return handlePricingInfo(interaction, client);
        }
        if (interaction.customId === 'order_info_faq') {
            return handleFAQInfo(interaction, client);
        }
        if (interaction.customId === 'order_info_contact') {
            return handleContactInfo(interaction, client);
        }
    });
};

async function handleViewCode(interaction, code, client) {
    const embeds = [];

    const infoEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`${emoji.dl_code || '💻'} ${code.name}`)
        .setDescription(code.description || 'No description')
        .addFields(
            { name: 'Language', value: code.language.toUpperCase(), inline: true },
            { name: 'Version', value: code.version, inline: true },
            { name: 'Downloads', value: `${code.downloads}`, inline: true }
        );

    embeds.push(infoEmbed);

    if (code.codeContent) {
        const codeEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle('Full Code')
            .setDescription(`\`\`\`${code.language}\n${code.codeContent.substring(0, 4000)}\n\`\`\``);
        
        if (code.codeContent.length > 4000) {
            codeEmbed.setFooter({ text: 'Code truncated - Use download for full code' });
        }
        
        embeds.push(codeEmbed);
    }

    if (code.files && code.files.length > 0) {
        const filesEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('Attached Files')
            .setDescription(code.files.map(f => 
                `${emoji.dl_file || '📄'} **${f.name}** (${formatBytes(f.size || 0)})`
            ).join('\n'));
        
        embeds.push(filesEmbed);
    }

    return interaction.reply({ embeds, ephemeral: true });
}

async function handleDownload(interaction, code, client) {
    codeDB.incrementDownloads(code.id);

    const attachments = [];

    if (code.codeContent) {
        const ext = getExtension(code.language);
        const buffer = Buffer.from(code.codeContent, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { 
            name: `${code.name.replace(/[^a-z0-9]/gi, '_')}.${ext}` 
        });
        attachments.push(attachment);
    }

    if (code.files && code.files.length > 0) {
        for (const file of code.files) {
            if (file.url) {
                try {
                    const fileBuffer = await downloadFile(file.url);
                    const attachment = new AttachmentBuilder(fileBuffer, { name: file.name });
                    attachments.push(attachment);
                } catch (error) {
                    console.error(`Failed to download file: ${file.name}`, error);
                }
            }
        }
    }

    if (attachments.length === 0) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#FEE75C')
                .setDescription(`${emoji.dl_info || 'ℹ️'} No downloadable content available for this code.`)
            ],
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle(`${emoji.dl_download || '📥'} Download Ready!`)
        .setDescription(
            `**${code.name}**\n\n` +
            `${emoji.dl_arrow || '▸'} Language: ${code.language}\n` +
            `${emoji.dl_arrow || '▸'} Version: ${code.version}\n\n` +
            `*Thank you for downloading!*`
        )
        .setFooter({ text: `Total downloads: ${code.downloads + 1}`, iconURL: client.user.displayAvatarURL() });

    return interaction.reply({ embeds: [embed], files: attachments, ephemeral: true });
}

async function handleStar(interaction, code, client) {
    codeDB.incrementStars(code.id);

    return interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor('#FEE75C')
            .setDescription(`${emoji.dl_star || '⭐'} You starred **${code.name}**!\n\nTotal stars: ${code.stars + 1}`)
        ],
        ephemeral: true
    });
}

async function handlePricingInfo(interaction, client) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`${emoji.dl_money || '💰'} DeadLoom Pricing`)
        .setDescription('Our competitive pricing for premium bot services:')
        .addFields(
            { 
                name: `${emoji.dl_music || '🎵'} Music Bot`, 
                value: '**$8/month**\nStreaming, playlists, filters, lyrics', 
                inline: true 
            },
            { 
                name: `${emoji.dl_ticket || '🎫'} Ticket Bot`, 
                value: '**$10/month**\nTranscripts, AI responses, panels', 
                inline: true 
            },
            { 
                name: `${emoji.dl_bot || '🤖'} Custom Bot`, 
                value: '**Starting $15**\nFully tailored to your needs', 
                inline: true 
            },
            { 
                name: '🛡️ Moderation Bot', 
                value: '**$12/month**\nAuto-mod, warnings, logs', 
                inline: true 
            },
            { 
                name: '💰 Economy Bot', 
                value: '**$10/month**\nCurrency, shop, gambling', 
                inline: true 
            },
            { 
                name: '✨ Premium Bundle', 
                value: '**$25/month**\nAll features + priority support', 
                inline: true 
            }
        )
        .addFields({
            name: '📋 What\'s Included',
            value: 
                `${emoji.dl_check || '✅'} 24/7 Hosting\n` +
                `${emoji.dl_check || '✅'} Free Updates\n` +
                `${emoji.dl_check || '✅'} Priority Support\n` +
                `${emoji.dl_check || '✅'} Custom Branding\n` +
                `${emoji.dl_check || '✅'} Setup Assistance`,
            inline: false
        })
        .setFooter({ text: 'Prices are subject to change', iconURL: client.user.displayAvatarURL() });

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleFAQInfo(interaction, client) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`${emoji.dl_question || '❓'} Frequently Asked Questions`)
        .addFields(
            {
                name: 'How long does deployment take?',
                value: 'Most bots are deployed within 24-48 hours after order confirmation.',
                inline: false
            },
            {
                name: 'What payment methods do you accept?',
                value: 'We accept Server Boosting and server invites.',
                inline: false
            },
            {
                name: 'Can I customize my bot?',
                value: 'Absolutely! All bots can be customized with your branding, colors, and specific features.',
                inline: false
            },
            {
                name: 'What if my bot goes offline?',
                value: 'We guarantee 99% uptime. If issues occur, our team responds within 2 hours.',
                inline: false
            },
            {
                name: 'Can I get a refund?',
                value: 'We offer a 7-day money-back guarantee if you\'re not satisfied.',
                inline: false
            },
            {
                name: 'Do you offer trials?',
                value: 'Yes! Contact us for a 24-hour trial of any bot type.',
                inline: false
            }
        )
        .setFooter({ text: 'Have more questions? Open a ticket!', iconURL: client.user.displayAvatarURL() });

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleContactInfo(interaction, client) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`${emoji.dl_chat || '💬'} Contact Us`)
        .setDescription(
            'Need help or have questions? Here\'s how to reach us:\n\n' +
            `${emoji.dl_arrow || '▸'} **Open a Ticket** - Select a service above to open an order ticket\n` +
            `${emoji.dl_arrow || '▸'} **Email** - support@deadloom.com\n` +
            `${emoji.dl_arrow || '▸'} **Response Time** - Usually within 2 hours\n\n` +
            '*Our team is available 24/7 to assist you!*'
        )
        .setFooter({ text: 'DeadLoom Support', iconURL: client.user.displayAvatarURL() });

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Open Order Ticket')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('order_open_ticket')
            .setEmoji(emoji.dl_ticket || '🎫')
    );

    return interaction.reply({ embeds: [embed], components: [buttons], ephemeral: true });
}

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

function getExtension(language) {
    const extensions = {
        javascript: 'js',
        js: 'js',
        python: 'py',
        py: 'py',
        typescript: 'ts',
        ts: 'ts',
        java: 'java',
        csharp: 'cs',
        cs: 'cs',
        cpp: 'cpp',
        c: 'c',
        go: 'go',
        rust: 'rs',
        ruby: 'rb',
        php: 'php',
        html: 'html',
        css: 'css',
        json: 'json',
        yaml: 'yaml',
        yml: 'yml',
        sql: 'sql',
        shell: 'sh',
        bash: 'sh'
    };
    return extensions[language.toLowerCase()] || 'txt';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
