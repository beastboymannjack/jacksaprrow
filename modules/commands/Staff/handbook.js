const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: "handbook",
    description: "Staff handbook - training materials and guides",
    usage: "handbook <list|read|add|edit|delete> [section]",
    aliases: ["guide", "book", "training"],

    run: async (client, message, args) => {
        const subcommand = args[0]?.toLowerCase();
        const guildId = message.guild.id;

        client.handbook.ensure(guildId, {});

        const handbook = client.handbook.get(guildId);

        if (!subcommand || subcommand === 'list') {
            const sections = Object.keys(handbook);
            
            if (sections.length === 0) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#FEE75C")
                        .setTitle("📚 Staff Handbook")
                        .setDescription("No handbook sections have been created yet.")
                        .addFields({ name: "📋 Getting Started", value: "Admins can add sections using:\n`handbook add <section_name>`" })
                        .setFooter({ text: "Staff Management System" })
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("📚 Staff Handbook")
                .setDescription("Select a section to read:")
                .setFooter({ text: `${sections.length} sections available` });

            let sectionList = '';
            for (const section of sections) {
                const data = handbook[section];
                sectionList += `**${section}**\n└ Last updated: <t:${Math.floor(new Date(data.updatedAt).getTime() / 1000)}:R>\n\n`;
            }

            embed.addFields({ name: "📋 Available Sections", value: sectionList || 'None' });
            embed.addFields({ name: "💡 Usage", value: "`handbook read <section>` - Read a section\n`handbook add <section>` - Add new section (Admin)\n`handbook edit <section>` - Edit section (Admin)" });

            return message.reply({ embeds: [embed] });
        }

        if (subcommand === 'read') {
            const sectionName = args.slice(1).join(' ').toLowerCase();
            
            if (!sectionName) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Missing Section")
                        .setDescription("Please specify a section to read.\n\n**Usage:** `handbook read <section_name>`")
                    ]
                });
            }

            const section = Object.entries(handbook).find(([key]) => 
                key.toLowerCase() === sectionName
            );

            if (!section) {
                const available = Object.keys(handbook).join(', ') || 'None';
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Section Not Found")
                        .setDescription(`No section called "${sectionName}" found.\n\n**Available:** ${available}`)
                    ]
                });
            }

            const [name, data] = section;
            const content = data.content;
            const chunks = [];
            
            for (let i = 0; i < content.length; i += 1800) {
                chunks.push(content.substring(i, i + 1800));
            }

            const embeds = chunks.map((chunk, index) => 
                new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle(index === 0 ? `📖 ${name}` : `📖 ${name} (continued)`)
                    .setDescription(chunk)
                    .setFooter({ text: `Page ${index + 1}/${chunks.length} • Last updated by ${data.author}` })
            );

            for (const embed of embeds) {
                await message.channel.send({ embeds: [embed] });
            }
        }

        else if (subcommand === 'add' || subcommand === 'create') {
            if (!message.member.permissions.has("ADMINISTRATOR")) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Permission Denied")
                        .setDescription("Only administrators can add handbook sections.")
                    ]
                });
            }

            const sectionName = args.slice(1).join(' ');
            
            if (!sectionName) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Missing Section Name")
                        .setDescription("Please provide a name for the section.\n\n**Usage:** `handbook add <section_name>`")
                    ]
                });
            }

            if (handbook[sectionName]) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Section Exists")
                        .setDescription(`A section called "${sectionName}" already exists. Use \`handbook edit ${sectionName}\` to edit it.`)
                    ]
                });
            }

            await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle(`📝 Creating: ${sectionName}`)
                    .setDescription("Please type the content for this section.\n\nYou can use Discord formatting (bold, italics, etc).\n\n*Type `cancel` to cancel.*")
                    .setFooter({ text: "You have 5 minutes to respond" })
                ]
            });

            const collector = message.channel.createMessageCollector({
                filter: m => m.author.id === message.author.id,
                time: 300000,
                max: 1
            });

            collector.on('collect', async (contentMsg) => {
                if (contentMsg.content.toLowerCase() === 'cancel') {
                    return contentMsg.reply({
                        embeds: [new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle("❌ Cancelled")
                            .setDescription("Handbook section creation cancelled.")
                        ]
                    });
                }

                handbook[sectionName] = {
                    content: contentMsg.content,
                    author: message.author.tag,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                client.handbook.set(guildId, handbook);

                await contentMsg.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#57F287")
                        .setTitle("✅ Section Created")
                        .setDescription(`**${sectionName}** has been added to the handbook.`)
                        .addFields({ name: "📖 Preview", value: contentMsg.content.substring(0, 200) + (contentMsg.content.length > 200 ? '...' : '') })
                    ]
                });
            });
        }

        else if (subcommand === 'edit' || subcommand === 'update') {
            if (!message.member.permissions.has("ADMINISTRATOR")) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Permission Denied")
                        .setDescription("Only administrators can edit handbook sections.")
                    ]
                });
            }

            const sectionName = args.slice(1).join(' ').toLowerCase();
            
            if (!sectionName) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Missing Section")
                        .setDescription("Please specify which section to edit.\n\n**Usage:** `handbook edit <section_name>`")
                    ]
                });
            }

            const section = Object.entries(handbook).find(([key]) => 
                key.toLowerCase() === sectionName
            );

            if (!section) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Section Not Found")
                        .setDescription(`No section called "${sectionName}" found.`)
                    ]
                });
            }

            const [originalName, data] = section;

            await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle(`📝 Editing: ${originalName}`)
                    .setDescription("**Current Content:**\n" + data.content.substring(0, 500) + (data.content.length > 500 ? '...' : ''))
                    .addFields({ name: "📋 Instructions", value: "Type the new content to replace it.\n\n*Type `cancel` to cancel.*" })
                    .setFooter({ text: "You have 5 minutes to respond" })
                ]
            });

            const collector = message.channel.createMessageCollector({
                filter: m => m.author.id === message.author.id,
                time: 300000,
                max: 1
            });

            collector.on('collect', async (contentMsg) => {
                if (contentMsg.content.toLowerCase() === 'cancel') {
                    return contentMsg.reply({
                        embeds: [new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle("❌ Cancelled")
                            .setDescription("Edit cancelled.")
                        ]
                    });
                }

                handbook[originalName] = {
                    ...data,
                    content: contentMsg.content,
                    author: message.author.tag,
                    updatedAt: new Date()
                };

                client.handbook.set(guildId, handbook);

                await contentMsg.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#57F287")
                        .setTitle("✅ Section Updated")
                        .setDescription(`**${originalName}** has been updated.`)
                    ]
                });
            });
        }

        else if (subcommand === 'delete' || subcommand === 'remove') {
            if (!message.member.permissions.has("ADMINISTRATOR")) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Permission Denied")
                        .setDescription("Only administrators can delete handbook sections.")
                    ]
                });
            }

            const sectionName = args.slice(1).join(' ').toLowerCase();
            
            if (!sectionName) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Missing Section")
                        .setDescription("Please specify which section to delete.\n\n**Usage:** `handbook delete <section_name>`")
                    ]
                });
            }

            const section = Object.entries(handbook).find(([key]) => 
                key.toLowerCase() === sectionName
            );

            if (!section) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle("❌ Section Not Found")
                        .setDescription(`No section called "${sectionName}" found.`)
                    ]
                });
            }

            const [originalName] = section;

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('handbook_delete_confirm')
                        .setLabel('Delete')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('handbook_delete_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            const confirmMsg = await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#FEE75C")
                    .setTitle("⚠️ Confirm Deletion")
                    .setDescription(`Are you sure you want to delete **${originalName}**?\n\nThis action cannot be undone.`)
                ],
                components: [row]
            });

            const collector = confirmMsg.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 30000,
                max: 1
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'handbook_delete_confirm') {
                    delete handbook[originalName];
                    client.handbook.set(guildId, handbook);

                    await interaction.update({
                        embeds: [new EmbedBuilder()
                            .setColor("#57F287")
                            .setTitle("✅ Section Deleted")
                            .setDescription(`**${originalName}** has been removed from the handbook.`)
                        ],
                        components: []
                    });
                } else {
                    await interaction.update({
                        embeds: [new EmbedBuilder()
                            .setColor("#57F287")
                            .setTitle("✅ Cancelled")
                            .setDescription("Deletion cancelled.")
                        ],
                        components: []
                    });
                }
            });
        }

        else {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Unknown Command")
                    .setDescription("**Available commands:**\n`handbook list` - View all sections\n`handbook read <section>` - Read a section\n`handbook add <section>` - Add new section\n`handbook edit <section>` - Edit a section\n`handbook delete <section>` - Delete a section")
                ]
            });
        }
    }
};
