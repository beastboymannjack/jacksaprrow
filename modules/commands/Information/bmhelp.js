const Discord = require("discord.js");

module.exports = {
    name: "bmhelp",
    aliases: ["botmhelp", "bmahelp"],
    category: "Information",
    description: "Advanced Bot Management System Help",
    run: async (client, message, args) => {
        const embed = new Discord.EmbedBuilder()
            .setColor("#5865F2")
            .setAuthor({ name: "🤖 Advanced Bot Management System", iconURL: message.guild.iconURL({ dynamic: true }) })
            .setDescription("Complete guide to the advanced bot management commands");

        const embed1 = new Discord.EmbedBuilder()
            .setColor("#5865F2")
            .setAuthor({ name: "BM | Basic Commands", iconURL: message.guild.iconURL({ dynamic: true }) })
            .addFields({ name: "`,bm`", value: "Opens interactive bot management menu", inline: true })
            .addFields({ name: "`,bm list`", value: "List all bots with status categorization", inline: true })
            .addFields({ name: "`,bm status <bot>`", value: "Detailed status of a specific bot", inline: true })
            .addFields({ name: "`,bm start <bot>`", value: "Start a bot with auto-recovery", inline: true })
            .addFields({ name: "`,bm stop <bot>`", value: "Stop a running bot safely", inline: true })
            .addFields({ name: "`,bm restart <bot>`", value: "Restart a bot with PID tracking", inline: true })
            .addFields({ name: "`,bm delete <bot>`", value: "Delete bot with confirmation (owners only)", inline: true })
            .addFields({ name: "`,bm health`", value: "System health check (Good/Warning/Critical)", inline: true });

        const embed2 = new Discord.EmbedBuilder()
            .setColor("#57F287")
            .setAuthor({ name: "BM | Analytics & Monitoring", iconURL: message.guild.iconURL({ dynamic: true }) })
            .addFields({ name: "`,bm analytics`", value: "View system-wide bot statistics", inline: true })
            .addFields({ name: "`,bm stats <bot>`", value: "Individual bot metrics and uptime", inline: true })
            .addFields({ name: "`,bm monitor <bot> <on/off>`", value: "Enable/disable bot monitoring", inline: true })
            .addFields({ name: "`,bm logs <bot>`", value: "View bot console logs", inline: true })
            .addFields({ name: "`,bm config <bot>`", value: "Manage bot configuration", inline: true })
            .addFields({ name: "`,bm filter <type>`", value: "Filter bots (online/offline/missing)", inline: true });

        const embed3 = new Discord.EmbedBuilder()
            .setColor("#FEE75C")
            .setAuthor({ name: "BM | Bulk Operations", iconURL: message.guild.iconURL({ dynamic: true }) })
            .addFields({ name: "`,bm bulkstart`", value: "Start all bots at once with confirmation", inline: true })
            .addFields({ name: "`,bm bulkstop`", value: "Stop all bots safely with confirmation", inline: true })
            .addFields({ name: "`,bm bulkrestart`", value: "Restart all bots with progress tracking", inline: true })
            .addFields({ name: "`,bm schedule <bot> <op> <time>`", value: "Schedule bot operations for later", inline: true });

        const embed4 = new Discord.EmbedBuilder()
            .setColor("#ED4245")
            .setAuthor({ name: "BM | Advanced Management", iconURL: message.guild.iconURL({ dynamic: true }) })
            .addFields({ name: "`,botinfo <bot>`", value: "Get comprehensive bot information\n**Alias:** binfo, checkbot", inline: true })
            .addFields({ name: "`,autorestart <bot> <on/off>`", value: "Enable auto-restart on crashes\n**Alias:** autofix", inline: true })
            .addFields({ name: "`,backup <bot>`", value: "Create backup of bot files\n**Alias:** bkup, backupbot", inline: true })
            .addFields({ name: "`,dependency <bot>`", value: "Check bot dependencies & versions\n**Alias:** deps, dep, checkdep", inline: true });

        const embed5 = new Discord.EmbedBuilder()
            .setColor("#5865F2")
            .setAuthor({ name: "BM | Features & Examples", iconURL: message.guild.iconURL({ dynamic: true }) })
            .addFields({ name: "Key Features", value: "✅ Real-time status monitoring\n" +
                "✅ Detailed bot analytics & metrics\n" +
                "✅ Bulk operations with confirmation\n" +
                "✅ Auto-restart on crashes\n" +
                "✅ Backup & restore functionality\n" +
                "✅ Dependency tracking\n" +
                "✅ System health checks\n" +
                "✅ Scheduled operations\n" +
                "✅ Advanced filtering & search\n" +
                "✅ Uptime tracking", inline: false })
            .addFields({ name: "Examples", value: "`,bm list` - See all bots\n" +
                "`,bm status MyBot` - Check bot health\n" +
                "`,bm analytics` - View system stats\n" +
                "`,botinfo MyBot` - Bot details\n" +
                "`,dependency MyBot` - Check packages\n" +
                "`,autorestart MyBot on` - Enable auto-recovery", inline: false });

        const pages = [embed1, embed2, embed3, embed4, embed5];

        if (pages.length === 0) return;

        let page = 0;
        const msg = await message.reply({
            embeds: [pages[page]],
            components: [{
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 1,
                        label: "⬅️ Previous",
                        customId: "prev_bm",
                        disabled: page === 0,
                    },
                    {
                        type: 2,
                        style: 1,
                        label: "➡️ Next",
                        customId: "next_bm",
                        disabled: page === pages.length - 1,
                    },
                ]
            }]
        });

        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (button) => {
            if (button.user.id !== message.author.id) {
                return button.reply({ content: "❌ You can't use this!", ephemeral: true });
            }

            if (button.customId === 'prev_bm') {
                page = Math.max(0, page - 1);
            } else if (button.customId === 'next_bm') {
                page = Math.min(pages.length - 1, page + 1);
            }

            await button.update({
                embeds: [pages[page]],
                components: [{
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 1,
                            label: "⬅️ Previous",
                            customId: "prev_bm",
                            disabled: page === 0,
                        },
                        {
                            type: 2,
                            style: 1,
                            label: "➡️ Next",
                            customId: "next_bm",
                            disabled: page === pages.length - 1,
                        },
                    ]
                }]
            });
        });

        collector.on('end', () => {
            msg.edit({ components: [] }).catch(() => { });
        });
    }
};
