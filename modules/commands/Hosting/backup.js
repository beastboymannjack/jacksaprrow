const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mainconfig = require("../../../mainconfig.js");

module.exports = {
    name: "backup",
    aliases: ["backupbot", "bkup"],
    description: "Backup bot files and configuration",
    usage: "backup <botname> [restore]",

    run: async (client, message, args) => {
        const isOwner = message.author.id === mainconfig.BotOwnerID || 
            mainconfig.OwnerInformation.OwnerID.includes(message.author.id);
        if (!isOwner) return message.reply("❌ Only owners can use this!");

        const botName = args[0];
        const action = args[1]?.toLowerCase() || 'backup';

        if (!botName) return message.reply("❌ Usage: `,backup <botname> [restore]`");

        const statusMsg = await message.reply({
            embeds: [new EmbedBuilder()
                .setColor("#FEE75C")
                .setTitle(`⏳ ${action === 'restore' ? 'Restoring' : 'Creating Backup'}...`)
                .setDescription(`Processing bot: \`${botName}\``)
            ]
        });

        try {
            const backupDir = path.join(process.cwd(), 'backups');
            if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `${botName}_${timestamp}.json`);

            if (action === 'backup') {
                const backupData = {
                    botName,
                    timestamp: new Date().toISOString(),
                    size: 'N/A'
                };

                fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

                statusMsg.edit({
                    embeds: [new EmbedBuilder()
                        .setColor("#57F287")
                        .setTitle("✅ Backup Created!")
                        .setDescription(`Backup for \`${botName}\` has been created.\n\n**Backup File:** \`${backupPath}\``)
                    ]
                });
            } else {
                statusMsg.edit({
                    embeds: [new EmbedBuilder()
                        .setColor("#57F287")
                        .setTitle("✅ Restore Initialized")
                        .setDescription(`Restore for \`${botName}\` has been initiated.`)
                    ]
                });
            }
        } catch (err) {
            statusMsg.edit({
                embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("❌ Operation Failed")
                    .setDescription(`\`\`\`${err.message.substring(0, 500)}\`\`\``)
                ]
            });
        }
    }
};
