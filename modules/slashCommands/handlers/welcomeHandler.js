const { EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

async function handleWelcomeCommand(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    
    client.serversettings.ensure(guildId, {
        welcome: {
            enabled: false,
            channel: null,
            autorole: null,
            message: '',
            embed: {
                enabled: true,
                title: 'Welcome to {server}',
                description: `Hey {user}, glad to have you here!\n\nWe help developers bring their Discord bot ideas to life. Whether you need custom bot code, ready-made solutions, or guidance on building your own — you're in the right place.\n\n**Get Started:**\n→ Browse bot codes in <#1440723121177886859>\n→ Need help? Open a ticket in <#1440723121177886859>\n→ Chat with the community in <#1440723121177886859>\n\nTake a look around and feel free to ask questions. We're here to help.`,
                color: '#5865F2',
                thumbnail: '{avatar}',
                image: null,
                footer: 'Member #{count}'
            },
            dm: {
                enabled: false,
                message: `Hey {username}, welcome to {server}!\n\nWe're a community focused on Discord bot development. Feel free to explore and reach out if you need any help getting started.`
            }
        }
    });

    const settings = client.serversettings.get(guildId);

    switch (subcommand) {
        case 'setup': {
            const channel = interaction.options.getChannel('channel');
            const autorole = interaction.options.getRole('autorole');

            settings.welcome.enabled = true;
            settings.welcome.channel = channel.id;
            settings.welcome.embed.enabled = true;
            if (autorole) settings.welcome.autorole = autorole.id;

            client.serversettings.set(guildId, settings);

            const embed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('Welcome System Enabled')
                .setDescription('New members will now receive a welcome message when they join.')
                .addFields(
                    { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                    { name: 'Auto-Role', value: autorole ? `<@&${autorole.id}>` : 'None', inline: true }
                )
                .setFooter({ text: 'Use /welcome embed to customize the welcome message' });

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            break;
        }

        case 'message': {
            const text = interaction.options.getString('text');
            settings.welcome.message = text;
            client.serversettings.set(guildId, settings);

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Welcome Message Updated')
                .setDescription('Your custom welcome message has been saved!')
                .addFields(
                    { name: 'New Message', value: text },
                    { name: 'Available Placeholders', value: '`{user}` - Mentions the user\n`{username}` - Username\n`{server}` - Server name\n`{count}` - Member count' }
                );

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            break;
        }

        case 'embed': {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('color') || '#5865F2';
            const thumbnail = interaction.options.getString('thumbnail');
            const image = interaction.options.getString('image');

            settings.welcome.embed = {
                enabled: true,
                title,
                description,
                color,
                thumbnail: thumbnail || '{avatar}',
                image: image || null,
                footer: 'Member #{count}'
            };

            client.serversettings.set(guildId, settings);

            const previewEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title.replace(/{user}/g, interaction.user.username).replace(/{server}/g, interaction.guild.name))
                .setDescription(description.replace(/{user}/g, `<@${interaction.user.id}>`).replace(/{username}/g, interaction.user.username).replace(/{server}/g, interaction.guild.name).replace(/{count}/g, interaction.guild.memberCount))
                .setThumbnail(thumbnail === '{avatar}' || !thumbnail ? interaction.user.displayAvatarURL() : thumbnail)
                .setFooter({ text: `Member #${interaction.guild.memberCount}` })
                .setTimestamp();

            if (image) previewEmbed.setImage(image);

            await interaction.reply({
                content: '**Welcome embed configured.** Here\'s a preview:',
                embeds: [previewEmbed],
                ephemeral: true
            });
            break;
        }

        case 'dm': {
            const enabled = interaction.options.getBoolean('enabled');
            const message = interaction.options.getString('message');

            settings.welcome.dm = {
                enabled,
                message: message || settings.welcome.dm.message
            };

            client.serversettings.set(guildId, settings);

            const embed = new EmbedBuilder()
                .setColor(enabled ? '#57F287' : '#ED4245')
                .setTitle(`DM Welcome ${enabled ? 'Enabled' : 'Disabled'}`)
                .setDescription(enabled ? 'New members will receive a DM when they join!' : 'DM welcome messages have been disabled.')
                .addFields({ name: 'DM Message', value: settings.welcome.dm.message });

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            break;
        }

        case 'test': {
            if (!settings.welcome.enabled || !settings.welcome.channel) {
                return interaction.reply({
                    content: 'Welcome system is not set up! Use `/welcome setup` first.',
                    ephemeral: true
                });
            }

            const channel = interaction.guild.channels.cache.get(settings.welcome.channel);
            if (!channel) {
                return interaction.reply({
                    content: 'Welcome channel not found! Please set it up again.',
                    ephemeral: true
                });
            }

            const welcomeMessage = formatWelcomeMessage(settings.welcome.message, interaction.member, interaction.guild);

            if (settings.welcome.embed.enabled) {
                const embed = createWelcomeEmbed(settings.welcome.embed, interaction.member, interaction.guild);
                await channel.send({ content: welcomeMessage, embeds: [embed] });
            } else {
                await channel.send(welcomeMessage);
            }

            await interaction.reply({
                content: `Test welcome message sent to <#${channel.id}>!`,
                ephemeral: true
            });
            break;
        }

        case 'disable': {
            settings.welcome.enabled = false;
            client.serversettings.set(guildId, settings);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('Welcome System Disabled')
                    .setDescription('The welcome system has been disabled.')
                ],
                ephemeral: true
            });
            break;
        }

        case 'reset': {
            const defaultWelcome = {
                enabled: settings.welcome.enabled,
                channel: settings.welcome.channel,
                autorole: settings.welcome.autorole,
                message: '',
                embed: {
                    enabled: true,
                    title: 'Welcome to {server}',
                    description: `Hey {user}, glad to have you here!\n\nWe help developers bring their Discord bot ideas to life. Whether you need custom bot code, ready-made solutions, or guidance on building your own — you're in the right place.\n\n**Get Started:**\n→ Browse bot codes in <#1440723121177886859>\n→ Need help? Open a ticket in <#1440723121177886859>\n→ Chat with the community in <#1440723121177886859>\n\nTake a look around and feel free to ask questions. We're here to help.`,
                    color: '#5865F2',
                    thumbnail: '{avatar}',
                    image: null,
                    footer: 'Member #{count}'
                },
                dm: {
                    enabled: false,
                    message: `Hey {username}, welcome to {server}!\n\nWe're a community focused on Discord bot development. Feel free to explore and reach out if you need any help getting started.`
                }
            };

            settings.welcome = defaultWelcome;
            client.serversettings.set(guildId, settings);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('Welcome Message Reset')
                    .setDescription('Your welcome message has been reset to the default bot development theme.\n\nUse `/welcome test` to preview it.')
                ],
                ephemeral: true
            });
            break;
        }
    }
}

function formatWelcomeMessage(template, member, guild) {
    return template
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, guild.name)
        .replace(/{count}/g, guild.memberCount);
}

function createWelcomeEmbed(embedConfig, member, guild) {
    const embed = new EmbedBuilder()
        .setColor(embedConfig.color || '#5865F2')
        .setTitle(formatWelcomeMessage(embedConfig.title, member, guild))
        .setDescription(formatWelcomeMessage(embedConfig.description, member, guild))
        .setTimestamp();

    if (embedConfig.thumbnail === '{avatar}') {
        embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
    } else if (embedConfig.thumbnail) {
        embed.setThumbnail(embedConfig.thumbnail);
    }

    if (embedConfig.image) {
        embed.setImage(embedConfig.image);
    }

    if (embedConfig.footer) {
        embed.setFooter({ text: formatWelcomeMessage(embedConfig.footer, member, guild) });
    }

    return embed;
}

async function handleGoodbyeCommand(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    client.serversettings.ensure(guildId, {
        goodbye: {
            enabled: false,
            channel: null,
            message: 'Goodbye **{username}**! We\'ll miss you!'
        }
    });

    const settings = client.serversettings.get(guildId);

    switch (subcommand) {
        case 'setup': {
            const channel = interaction.options.getChannel('channel');
            settings.goodbye = {
                ...settings.goodbye,
                enabled: true,
                channel: channel.id
            };
            client.serversettings.set(guildId, settings);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('Goodbye System Configured')
                    .addFields({ name: 'Channel', value: `<#${channel.id}>` })
                ],
                ephemeral: true
            });
            break;
        }

        case 'message': {
            const text = interaction.options.getString('text');
            settings.goodbye.message = text;
            client.serversettings.set(guildId, settings);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('Goodbye Message Updated')
                    .addFields({ name: 'New Message', value: text })
                ],
                ephemeral: true
            });
            break;
        }

        case 'disable': {
            settings.goodbye.enabled = false;
            client.serversettings.set(guildId, settings);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('Goodbye System Disabled')
                ],
                ephemeral: true
            });
            break;
        }
    }
}

module.exports = { handleWelcomeCommand, handleGoodbyeCommand, formatWelcomeMessage, createWelcomeEmbed };
