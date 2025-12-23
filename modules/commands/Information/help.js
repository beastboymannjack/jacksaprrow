const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

module.exports = {
    name: "help", 
    category: "Information", 
    aliases: ["h", "commandinfo", "cmds", "cmd", "halp"],
    description: "Returns all Commands, or one specific command", 
    run: async (client, message, args, prefix) => {
        
        const embed1 = new EmbedBuilder()
        .setColor("Green")
        .setAuthor({ name: "DeadLoom | Bot Hosting & Management | Information Commands", iconURL: message.guild.iconURL({dynamic: true}) })
        .setFooter({ text: "Page 1/7 - Information Commands" })
        .addFields(
            { name: `\`${prefix}help\``, value: "*Shows all commands*", inline: true },
            { name: `\`${prefix}ping\``, value: "*Shows the Ping of the Bot*", inline: true },
            { name: `\`${prefix}botinfo\``, value: "*Shows bot information*", inline: true },
            { name: `\`${prefix}serverinfo\``, value: "*Shows server information*", inline: true },
            { name: `\`${prefix}userinfo [@User]\``, value: "*Shows user information*", inline: true },
            { name: `\`${prefix}memberinfo [@User]\``, value: "*Shows member information*", inline: true },
            { name: `\`${prefix}channelinfo [#Channel]\``, value: "*Shows channel information*", inline: true },
            { name: `\`${prefix}roleinfo [Role]\``, value: "*Shows role information*", inline: true },
            { name: `\`${prefix}avatar [@User]\``, value: "*Shows user avatar*", inline: true },
            { name: `\`${prefix}emojiinfo [Emoji]\``, value: "*Shows emoji information*", inline: true },
            { name: `\`${prefix}permissions [@User]\``, value: "*Shows user permissions*", inline: true },
            { name: `\`${prefix}membercount\``, value: "*Shows server member count*", inline: true }
        );

        const embed2 = new EmbedBuilder()
        .setColor("Yellow")
        .setAuthor({ name: "DeadLoom | Bot Hosting & Management | Setup & Pricing", iconURL: message.guild.iconURL({dynamic: true}) })
        .setFooter({ text: "Page 2/7 - Setup Commands & Pricing" })
        .setDescription("**💰 BOT PRICING:**\n🎉 **Free Hosting** - 5 invites\n💳 **Custom Bot** - $6/month\n")
        .addFields(
            { name: `\`${prefix}setuporder\``, value: "*Setup bot ordering system*", inline: true },
            { name: `\`${prefix}setupticket\``, value: "*Setup ticket system*", inline: true },
            { name: `\`${prefix}setupverify\``, value: "*Setup verification channel*", inline: true },
            { name: `\`${prefix}setupsuggest\``, value: "*Setup suggestions channel*", inline: true },
            { name: `\`${prefix}setupfeedback\``, value: "*Setup feedback channel*", inline: true },
            { name: `\`${prefix}setupnodestats\``, value: "*Setup node status roles*", inline: true },
            { name: `\`${prefix}embed\``, value: "*Create custom embeds*", inline: true },
            { name: `\`${prefix}editembed\``, value: "*Edit existing embeds*", inline: true },
            { name: `\`${prefix}stickysetup\``, value: "*Setup sticky messages*", inline: true },
            { name: `\`${prefix}ensure\``, value: "*Ensure database integrity*", inline: true },
            { name: `\`${prefix}clear\``, value: "*Clear messages*", inline: true },
            { name: `\`${prefix}bmhelp\``, value: "*Bot management help*", inline: true }
        );

        const embed3 = new EmbedBuilder()
        .setColor("Red")
        .setAuthor({ name: "DeadLoom | Bot Hosting & Management | Moderation Commands", iconURL: message.guild.iconURL({dynamic: true}) })
        .setFooter({ text: "Page 3/7 - Moderation Commands" })
        .addFields(
            { name: `\`${prefix}warn [@User] [Reason]\``, value: "*Warns a member*", inline: true },
            { name: `\`${prefix}kick [@User] [Reason]\``, value: "*Kicks a member*", inline: true },
            { name: `\`${prefix}ban [@User] [Reason]\``, value: "*Bans a member*", inline: true },
            { name: `\`${prefix}unban [User ID] [Reason]\``, value: "*Unbans a member*", inline: true },
            { name: `\`${prefix}timeout [@User] [Time] [Reason]\``, value: "*Timeouts a member*", inline: true },
            { name: `\`${prefix}purge [Amount]\``, value: "*Delete messages*", inline: true },
            { name: `\`${prefix}clearpin [#Channel]\``, value: "*Clear pinned messages*", inline: true },
            { name: `\`${prefix}strikes [@User]\``, value: "*View member strikes*", inline: true },
            { name: `\`${prefix}history [@User]\``, value: "*View member history*", inline: true },
            { name: `\`${prefix}case [Case ID]\``, value: "*View case information*", inline: true },
            { name: `\`${prefix}removecase [Case ID]\``, value: "*Remove a case*", inline: true },
            { name: `\`${prefix}autopurge [Threshold]\``, value: "*Auto purge old messages*", inline: true }
        );

        const embed4 = new EmbedBuilder()
        .setColor("Orange")
        .setAuthor({ name: "DeadLoom | Bot Hosting & Management | Hosting Commands", iconURL: message.guild.iconURL({dynamic: true}) })
        .setFooter({ text: "Page 4/7 - Hosting Commands" })
        .addFields(
            { name: `\`${prefix}createbot\``, value: "*Create and deploy a new bot*", inline: true },
            { name: `\`${prefix}botinfo [@Bot]\``, value: "*View hosted bot information*", inline: true },
            { name: `\`${prefix}deletebot [@Bot]\``, value: "*Delete a hosted bot*", inline: true },
            { name: `\`${prefix}deletebotfolder [@Bot]\``, value: "*Delete bot folder*", inline: true },
            { name: `\`${prefix}logs [@Bot]\``, value: "*View bot logs*", inline: true },
            { name: `\`${prefix}backup [@Bot]\``, value: "*Backup bot data*", inline: true },
            { name: `\`${prefix}export [@Bot]\``, value: "*Export bot data*", inline: true },
            { name: `\`${prefix}migrate [@Bot] [Server]\``, value: "*Migrate bot to server*", inline: true },
            { name: `\`${prefix}clone [@Bot]\``, value: "*Clone a bot*", inline: true },
            { name: `\`${prefix}autorestart [@Bot] [Interval]\``, value: "*Set auto restart*", inline: true },
            { name: `\`${prefix}setexpiration [@Bot] [Date]\``, value: "*Set bot expiration*", inline: true },
            { name: `\`${prefix}distributed\``, value: "*View distributed bots*", inline: true }
        );

        const embed5 = new EmbedBuilder()
        .setColor("Blue")
        .setAuthor({ name: "DeadLoom | Bot Hosting & Management | Staff Commands", iconURL: message.guild.iconURL({dynamic: true}) })
        .setFooter({ text: "Page 5/7 - Staff Commands" })
        .addFields(
            { name: `\`${prefix}promote [@User] [Role]\``, value: "*Promote staff member*", inline: true },
            { name: `\`${prefix}demote [@User]\``, value: "*Demote staff member*", inline: true },
            { name: `\`${prefix}setrank [@User] [Rank]\``, value: "*Set staff rank*", inline: true },
            { name: `\`${prefix}loa [@User] [Reason]\``, value: "*Leave of absence*", inline: true },
            { name: `\`${prefix}leaderboard [Days]\``, value: "*Show staff leaderboard*", inline: true },
            { name: `\`${prefix}rank [@User]\``, value: "*Show user rank*", inline: true },
            { name: `\`${prefix}staffinfo [@User]\``, value: "*Show staff information*", inline: true },
            { name: `\`${prefix}staffstats [@User]\``, value: "*Show staff statistics*", inline: true },
            { name: `\`${prefix}handbook [Search]\``, value: "*View staff handbook*", inline: true },
            { name: `\`${prefix}inithandbook\``, value: "*Initialize handbook*", inline: true },
            { name: `\`${prefix}quickguide\``, value: "*Quick staff guide*", inline: true },
            { name: `\`${prefix}welcome\``, value: "*View welcome info*", inline: true }
        );

        const embed6 = new EmbedBuilder()
        .setColor("Purple")
        .setAuthor({ name: "DeadLoom | Bot Hosting & Management | Ticket & AI Commands", iconURL: message.guild.iconURL({dynamic: true}) })
        .setFooter({ text: "Page 6/7 - Ticket & AI Commands" })
        .addFields(
            { name: `\`${prefix}assign [@Staff]\``, value: "*Assign ticket to staff*", inline: true },
            { name: `\`${prefix}escalate\``, value: "*Escalate ticket priority*", inline: true },
            { name: `\`${prefix}priority [Level]\``, value: "*Set ticket priority*", inline: true },
            { name: `\`${prefix}transcript\``, value: "*Generate ticket transcript*", inline: true },
            { name: `\`${prefix}ask [Question]\``, value: "*Ask the AI*", inline: true },
            { name: `\`${prefix}learn [Input|Output]\``, value: "*Teach the AI*", inline: true },
            { name: `\`${prefix}aiAdvisor [Question]\``, value: "*Get moderation advice*", inline: true },
            { name: `\`${prefix}8ball [Question]\``, value: "*Magic 8 ball*", inline: true },
            { name: `\`${prefix}poll [Question|Options]\``, value: "*Create a poll*", inline: true },
            { name: `\`${prefix}coinflip\``, value: "*Flip a coin*", inline: true },
            { name: `\`${prefix}dashboard\``, value: "*View bot dashboard*", inline: true },
            { name: `\`${prefix}settings\``, value: "*View bot settings*", inline: true }
        );

        const embed7 = new EmbedBuilder()
        .setColor("#008080")
        .setAuthor({ name: "DeadLoom | Bot Hosting & Management | Security & Utility Commands", iconURL: message.guild.iconURL({dynamic: true}) })
        .setFooter({ text: "Page 7/7 - Security & Utility Commands" })
        .addFields(
            { name: `\`${prefix}antiraid\``, value: "*Anti-raid protection*", inline: true },
            { name: `\`${prefix}lockdown [Reason]\``, value: "*Lock down server*", inline: true },
            { name: `\`${prefix}verify [@User]\``, value: "*Verify a user*", inline: true },
            { name: `\`${prefix}botexpiration\``, value: "*Show bot expiration*", inline: true },
            { name: `\`${prefix}codeshare\``, value: "*Share code snippets*", inline: true },
            { name: `\`${prefix}achievements [@User]\``, value: "*Show achievements*", inline: true },
            { name: `\`${prefix}milestone\``, value: "*Milestone tracker*", inline: true },
            { name: `\`${prefix}progress [@User]\``, value: "*Show progress*", inline: true },
            { name: `\`${prefix}dailytip\``, value: "*Get daily tips*", inline: true },
            { name: `\`${prefix}serverid\``, value: "*Get server ID*", inline: true },
            { name: `\`${prefix}testnotification\``, value: "*Test notifications*", inline: true },
            { name: `\`${prefix}admin\``, value: "*Admin panel*", inline: true }
        );

        const embeds = [embed1, embed2, embed3, embed4, embed5, embed6, embed7];
        let currentPage = 0;

        // Create dropdown menu
        const createSelectMenu = () => {
            return new StringSelectMenuBuilder()
                .setCustomId('help_category_select')
                .setPlaceholder('📂 Jump to a category...')
                .addOptions([
                    { label: 'ℹ️ Information Commands', value: '0', description: 'View information commands', emoji: 'ℹ️' },
                    { label: '⚙️ Setup Commands', value: '1', description: 'View setup commands', emoji: '⚙️' },
                    { label: '🛡️ Moderation Commands', value: '2', description: 'View moderation commands', emoji: '🛡️' },
                    { label: '🤖 Hosting Commands', value: '3', description: 'View hosting commands', emoji: '🤖' },
                    { label: '👔 Staff Commands', value: '4', description: 'View staff commands', emoji: '👔' },
                    { label: '🎫 Ticket & AI Commands', value: '5', description: 'View ticket and AI commands', emoji: '🎫' },
                    { label: '🔐 Security & Utility', value: '6', description: 'View security and utility commands', emoji: '🔐' },
                ]);
        };

        // Create navigation buttons
        const createButtons = () => {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_prev')
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('help_next')
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 6),
                    new ButtonBuilder()
                        .setCustomId('help_close')
                        .setLabel('Close')
                        .setStyle(ButtonStyle.Danger)
                );
        };

        // Send initial message with dropdown and buttons
        const selectRow = new ActionRowBuilder().addComponents(createSelectMenu());
        const buttonRow = createButtons();

        const helpMessage = await message.reply({
            embeds: [embeds[currentPage]],
            components: [selectRow, buttonRow]
        });

        // Create collectors
        const selectCollector = helpMessage.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 300000,
            filter: (i) => i.user.id === message.author.id
        });

        const buttonCollector = helpMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000,
            filter: (i) => i.user.id === message.author.id
        });

        // Handle dropdown selection
        selectCollector.on('collect', async (interaction) => {
            currentPage = parseInt(interaction.values[0]);
            const newButtonRow = createButtons();
            await interaction.update({
                embeds: [embeds[currentPage]],
                components: [selectRow, newButtonRow]
            });
        });

        // Handle button clicks
        buttonCollector.on('collect', async (interaction) => {
            if (interaction.customId === 'help_next') {
                if (currentPage < 6) currentPage++;
            } else if (interaction.customId === 'help_prev') {
                if (currentPage > 0) currentPage--;
            } else if (interaction.customId === 'help_close') {
                selectCollector.stop();
                buttonCollector.stop();
                await interaction.update({ components: [] });
                return;
            }

            const newButtonRow = createButtons();
            await interaction.update({
                embeds: [embeds[currentPage]],
                components: [selectRow, newButtonRow]
            });
        });

        // Handle timeout
        selectCollector.on('end', () => {
            const disabledSelect = createSelectMenu().setDisabled(true);
            const disabledButtonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_prev')
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('help_next')
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('help_close')
                        .setLabel('Close')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(true)
                );
            helpMessage.edit({
                components: [
                    new ActionRowBuilder().addComponents(disabledSelect),
                    disabledButtonRow
                ]
            }).catch(() => {});
        });
    }
}
