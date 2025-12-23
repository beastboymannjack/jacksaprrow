const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, StringSelectMenuBuilder } = require('discord.js');
const codeDB = require('../../codeshare/codeDatabase');
const emoji = require('../../../emoji.json');
const mainconfig = require('../../../mainconfig');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'codeshare',
    aliases: ['code', 'cs'],
    category: 'Admin',
    description: 'Manage code sharing system for YouTube tutorials',
    usage: ',codeshare <create|list|delete|edit|view|analytics>',
    
    run: async (client, message, args, prefix) => {
        const cmd = module.exports;
        const isOwner = message.author.id === mainconfig.BotOwnerID || 
                        message.member.roles.cache.has(mainconfig.ServerRoles.FounderId);
        
        if (!isOwner) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.crossred || '❌'} Only the owner can manage code shares.`)
                ]
            });
        }

        const subCommand = args[0]?.toLowerCase();

        switch (subCommand) {
            case 'create':
            case 'add':
                return cmd.createCode(message, args.slice(1), client);
            case 'list':
                return cmd.listCodes(message, client);
            case 'delete':
            case 'remove':
                return cmd.deleteCode(message, args.slice(1), client);
            case 'edit':
            case 'update':
                return cmd.editCode(message, args.slice(1), client);
            case 'view':
            case 'show':
                return cmd.viewCode(message, args.slice(1), client);
            case 'analytics':
            case 'stats':
                return cmd.showAnalytics(message, client);
            case 'publish':
            case 'post':
                return cmd.publishCode(message, args.slice(1), client);
            default:
                return cmd.showHelp(message, client);
        }
    },

    async showHelp(message, client) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${emoji.dl_code || '💻'} Code Share System`)
            .setDescription('Manage and share code snippets for your YouTube tutorials.')
            .addFields(
                { name: `${emoji.dl_arrow || '▸'} Create Code`, value: '`,codeshare create`\nStart the code creation wizard', inline: true },
                { name: `${emoji.dl_arrow || '▸'} List Codes`, value: '`,codeshare list`\nView all shared codes', inline: true },
                { name: `${emoji.dl_arrow || '▸'} Delete Code`, value: '`,codeshare delete <id>`\nRemove a code share', inline: true },
                { name: `${emoji.dl_arrow || '▸'} View Code`, value: '`,codeshare view <id>`\nPreview a code share', inline: true },
                { name: `${emoji.dl_arrow || '▸'} Publish`, value: '`,codeshare publish <id>`\nPost code to channel', inline: true },
                { name: `${emoji.dl_arrow || '▸'} Analytics`, value: '`,codeshare analytics`\nView download stats', inline: true }
            )
            .setFooter({ text: 'DeadLoom Code Share System', iconURL: client.user.displayAvatarURL() });

        return message.reply({ embeds: [embed] });
    },

    async createCode(message, args, client) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${emoji.dl_code || '💻'} Create New Code Share`)
            .setDescription(
                'Please provide the following information:\n\n' +
                '**Step 1:** Send the code name\n' +
                '**Step 2:** Send the description\n' +
                '**Step 3:** Send the language (js, py, etc)\n' +
                '**Step 4:** Send the YouTube video link (optional, send "skip")\n' +
                '**Step 5:** Attach files or paste code content\n\n' +
                '*Type `cancel` at any time to stop.*'
            );

        await message.reply({ embeds: [embed] });

        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, time: 300000, max: 5 });

        let step = 1;
        let codeData = { createdBy: message.author.id };

        collector.on('collect', async (m) => {
            if (m.content.toLowerCase() === 'cancel') {
                collector.stop('cancelled');
                return m.reply('Code creation cancelled.');
            }

            switch (step) {
                case 1:
                    codeData.name = m.content;
                    step++;
                    await m.reply(`${emoji.dl_check || '✅'} Name set to: **${m.content}**\n\nNow send the **description**:`);
                    break;
                case 2:
                    codeData.description = m.content;
                    step++;
                    await m.reply(`${emoji.dl_check || '✅'} Description saved.\n\nNow send the **language** (js, py, go, etc):`);
                    break;
                case 3:
                    codeData.language = m.content.toLowerCase();
                    step++;
                    await m.reply(`${emoji.dl_check || '✅'} Language: **${m.content}**\n\nNow send the **YouTube video link** (or "skip"):`);
                    break;
                case 4:
                    codeData.videoLink = m.content.toLowerCase() === 'skip' ? '' : m.content;
                    step++;
                    await m.reply(`${emoji.dl_check || '✅'} Video link saved.\n\nNow **attach files** or **paste your code**:`);
                    break;
                case 5:
                    if (m.attachments.size > 0) {
                        const files = [];
                        for (const [, attachment] of m.attachments) {
                            files.push({
                                name: attachment.name,
                                url: attachment.url,
                                size: attachment.size
                            });
                        }
                        codeData.files = files;
                    } else {
                        codeData.codeContent = m.content;
                    }

                    const newCode = codeDB.createCode(codeData);
                    
                    const successEmbed = new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle(`${emoji.dl_check || '✅'} Code Share Created!`)
                        .addFields(
                            { name: 'ID', value: `\`${newCode.id}\``, inline: true },
                            { name: 'Name', value: newCode.name, inline: true },
                            { name: 'Language', value: newCode.language, inline: true }
                        )
                        .setDescription(`Use \`,codeshare publish ${newCode.id}\` to post it to a channel.`)
                        .setFooter({ text: 'DeadLoom Code Share', iconURL: client.user.displayAvatarURL() });

                    await m.reply({ embeds: [successEmbed] });
                    collector.stop('completed');
                    break;
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                message.channel.send('Code creation timed out.');
            }
        });
    },

    async listCodes(message, client) {
        const codes = codeDB.getAllCodes();

        if (codes.length === 0) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setDescription(`${emoji.dl_info || 'ℹ️'} No code shares found. Use \`,codeshare create\` to add one.`)
                ]
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${emoji.dl_folder || '📂'} Your Code Shares`)
            .setDescription(codes.map((code, index) => 
                `**${index + 1}.** \`${code.id}\` - **${code.name}**\n` +
                `   ${emoji.dl_arrow || '▸'} ${code.language} | ${emoji.dl_download || '📥'} ${code.downloads} downloads | ⭐ ${code.stars} stars`
            ).join('\n\n'))
            .setFooter({ text: `Total: ${codes.length} codes`, iconURL: client.user.displayAvatarURL() });

        return message.reply({ embeds: [embed] });
    },

    async deleteCode(message, args, client) {
        const codeId = args[0];

        if (!codeId) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.crossred || '❌'} Please provide a code ID.\nUsage: \`,codeshare delete <id>\``)
                ]
            });
        }

        const code = codeDB.getCodeById(codeId);
        if (!code) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.crossred || '❌'} Code not found with ID: \`${codeId}\``)
                ]
            });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('Confirm Deletion')
            .setDescription(`Are you sure you want to delete **${code.name}**?\n\nThis action cannot be undone.`);

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`codeshare_delete_confirm_${codeId}`)
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('codeshare_delete_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [buttons] });

        const collector = confirmMsg.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: 'This is not for you.', ephemeral: true });
            }

            if (i.customId === `codeshare_delete_confirm_${codeId}`) {
                codeDB.deleteCode(codeId);
                await i.update({
                    embeds: [new EmbedBuilder()
                        .setColor('#57F287')
                        .setDescription(`${emoji.dl_check || '✅'} Code **${code.name}** has been deleted.`)
                    ],
                    components: []
                });
            } else {
                await i.update({
                    embeds: [new EmbedBuilder()
                        .setColor('#5865F2')
                        .setDescription('Deletion cancelled.')
                    ],
                    components: []
                });
            }
            collector.stop();
        });
    },

    async viewCode(message, args, client) {
        const codeId = args[0];

        if (!codeId) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.crossred || '❌'} Please provide a code ID.\nUsage: \`,codeshare view <id>\``)
                ]
            });
        }

        const code = codeDB.getCodeById(codeId);
        if (!code) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.crossred || '❌'} Code not found with ID: \`${codeId}\``)
                ]
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${emoji.dl_code || '💻'} ${code.name}`)
            .setDescription(code.description || 'No description')
            .addFields(
                { name: 'ID', value: `\`${code.id}\``, inline: true },
                { name: 'Language', value: code.language, inline: true },
                { name: 'Version', value: code.version, inline: true },
                { name: 'Downloads', value: `${code.downloads}`, inline: true },
                { name: 'Stars', value: `${code.stars}`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(code.createdAt / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'DeadLoom Code Share', iconURL: client.user.displayAvatarURL() });

        if (code.videoLink) {
            embed.addFields({ name: 'YouTube Link', value: code.videoLink, inline: false });
        }

        if (code.codeContent) {
            const preview = code.codeContent.substring(0, 500);
            embed.addFields({ 
                name: 'Code Preview', 
                value: `\`\`\`${code.language}\n${preview}${code.codeContent.length > 500 ? '\n...' : ''}\n\`\`\``, 
                inline: false 
            });
        }

        if (code.files && code.files.length > 0) {
            embed.addFields({ 
                name: 'Files', 
                value: code.files.map(f => `${emoji.dl_file || '📄'} ${f.name}`).join('\n'), 
                inline: false 
            });
        }

        return message.reply({ embeds: [embed] });
    },

    async publishCode(message, args, client) {
        const codeId = args[0];
        const channelMention = args[1];

        if (!codeId) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.crossred || '❌'} Please provide a code ID.\nUsage: \`,codeshare publish <id> [#channel]\``)
                ]
            });
        }

        const code = codeDB.getCodeById(codeId);
        if (!code) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.crossred || '❌'} Code not found with ID: \`${codeId}\``)
                ]
            });
        }

        const targetChannel = message.mentions.channels.first() || message.channel;

        const heroEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: 'DeadLoom Code Share', iconURL: client.user.displayAvatarURL() })
            .setTitle(`${emoji.dl_code || '💻'} ${code.name}`)
            .setDescription(
                `${code.description || 'No description'}\n\n` +
                `${emoji.dl_arrow || '▸'} **Language:** ${code.language.toUpperCase()}\n` +
                `${emoji.dl_arrow || '▸'} **Version:** ${code.version}\n` +
                (code.videoLink ? `${emoji.dl_youtube || '🎬'} **Tutorial:** [Watch Video](${code.videoLink})\n` : '')
            );

        if (code.codeContent) {
            const preview = code.codeContent.substring(0, 800);
            heroEmbed.addFields({
                name: `${emoji.dl_file || '📄'} Code`,
                value: `\`\`\`${code.language}\n${preview}${code.codeContent.length > 800 ? '\n...' : ''}\n\`\`\``,
                inline: false
            });
        }

        heroEmbed.setFooter({ 
            text: `ID: ${code.id} | ${emoji.dl_download || '📥'} ${code.downloads} downloads | ⭐ ${code.stars} stars`,
            iconURL: client.user.displayAvatarURL()
        });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`code_view_${code.id}`)
                .setLabel('View Full Code')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(emoji.dl_code || '💻'),
            new ButtonBuilder()
                .setCustomId(`code_download_${code.id}`)
                .setLabel('Download')
                .setStyle(ButtonStyle.Success)
                .setEmoji(emoji.dl_download || '📥'),
            new ButtonBuilder()
                .setCustomId(`code_star_${code.id}`)
                .setLabel('Star')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(emoji.dl_star || '⭐')
        );

        if (code.videoLink) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setLabel('Watch Tutorial')
                    .setStyle(ButtonStyle.Link)
                    .setURL(code.videoLink)
                    .setEmoji(emoji.dl_youtube || '🎬')
            );
        }

        await targetChannel.send({ embeds: [heroEmbed], components: [buttons] });

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#57F287')
                .setDescription(`${emoji.dl_check || '✅'} Code published to ${targetChannel}`)
            ]
        });
    },

    async showAnalytics(message, client) {
        const analytics = codeDB.getAnalytics();

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${emoji.dl_stats || '📊'} Code Share Analytics`)
            .addFields(
                { name: 'Total Codes', value: `${analytics.totalCodes}`, inline: true },
                { name: 'Total Downloads', value: `${analytics.totalDownloads}`, inline: true },
                { name: 'Total Stars', value: `${analytics.totalStars}`, inline: true }
            );

        if (analytics.topCodes.length > 0) {
            embed.addFields({
                name: `${emoji.dl_crown || '👑'} Top Codes`,
                value: analytics.topCodes.map((c, i) => 
                    `**${i + 1}.** ${c.name} - ${c.downloads} downloads`
                ).join('\n'),
                inline: false
            });
        }

        if (analytics.recentCodes.length > 0) {
            embed.addFields({
                name: `${emoji.dl_sparkle || '✨'} Recent Codes`,
                value: analytics.recentCodes.map((c, i) => 
                    `**${i + 1}.** ${c.name} - <t:${Math.floor(c.createdAt / 1000)}:R>`
                ).join('\n'),
                inline: false
            });
        }

        embed.setFooter({ text: 'DeadLoom Code Share Analytics', iconURL: client.user.displayAvatarURL() });

        return message.reply({ embeds: [embed] });
    },

    async editCode(message, args, client) {
        const codeId = args[0];

        if (!codeId) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.crossred || '❌'} Please provide a code ID.\nUsage: \`,codeshare edit <id>\``)
                ]
            });
        }

        const code = codeDB.getCodeById(codeId);
        if (!code) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`${emoji.crossred || '❌'} Code not found with ID: \`${codeId}\``)
                ]
            });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`codeshare_edit_field_${codeId}`)
            .setPlaceholder('Select field to edit')
            .addOptions([
                { label: 'Name', value: 'name', description: 'Edit the code name' },
                { label: 'Description', value: 'description', description: 'Edit the description' },
                { label: 'Language', value: 'language', description: 'Change the language' },
                { label: 'Video Link', value: 'videoLink', description: 'Update YouTube link' },
                { label: 'Version', value: 'version', description: 'Change version number' },
                { label: 'Code Content', value: 'codeContent', description: 'Replace the code' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${emoji.dl_code || '💻'} Edit: ${code.name}`)
            .setDescription('Select which field you want to edit:');

        return message.reply({ embeds: [embed], components: [row] });
    }
};
