const { EmbedBuilder } = require('discord.js');
const mainconfig = require('../../../mainconfig');
const { parseExpirationInput, formatDuration, getExpirationDate, getRemainingTime } = require('../../utils/timeParser');

module.exports = {
    name: "setexpiration",
    aliases: ["setexp", "expiration", "botexpire", "extend", "renew"],
    category: "Hosting",
    description: "Set hosting expiration time for a bot with advanced time formats",
    usage: ",setexpiration <botname> <duration>\n\nExamples:\n  ,setexpiration mybot 7d - 7 days\n  ,setexpiration mybot 2w - 2 weeks\n  ,setexpiration mybot 1mo - 1 month\n  ,setexpiration mybot 1y - 1 year\n  ,setexpiration mybot 2w3d12h - 2 weeks, 3 days, 12 hours\n  ,setexpiration mybot 30m - 30 minutes",
    permissions: ["ADMINISTRATOR"],
    run: async (client, message, args, cmduser, text, prefix) => {
        const hasPermission = message.member.permissions.has("Administrator") ||
            message.member.roles.cache.has(mainconfig.ServerRoles?.FounderId) ||
            message.author.id === mainconfig.BotOwnerID;

        if (!hasPermission) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('You do not have permission to use this command.')
            ]});
        }

        if (!args[0] || !args[1]) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Set Bot Expiration')
                .setDescription(`**Usage:** \`${prefix}setexpiration <botname> <duration>\``)
                .addFields(
                    { name: 'Time Units', value: [
                        '`s` / `sec` / `seconds` - Seconds',
                        '`m` / `min` / `minutes` - Minutes',
                        '`h` / `hr` / `hours` - Hours',
                        '`d` / `day` / `days` - Days',
                        '`w` / `wk` / `weeks` - Weeks',
                        '`mo` / `month` / `months` - Months',
                        '`y` / `yr` / `years` - Years'
                    ].join('\n') },
                    { name: 'Examples', value: [
                        `\`${prefix}setexpiration mybot 7d\` - 7 days`,
                        `\`${prefix}setexpiration mybot 2w\` - 2 weeks`,
                        `\`${prefix}setexpiration mybot 1mo\` - 1 month`,
                        `\`${prefix}setexpiration mybot 1y\` - 1 year`,
                        `\`${prefix}setexpiration mybot 2w3d12h\` - Complex duration`,
                        `\`${prefix}setexpiration mybot 30m\` - 30 minutes`
                    ].join('\n') },
                    { name: 'Quick Presets', value: [
                        `\`${prefix}setexpiration mybot 1hour\` - 1 hour`,
                        `\`${prefix}setexpiration mybot 1week\` - 1 week`,
                        `\`${prefix}setexpiration mybot 1month\` - 1 month`,
                        `\`${prefix}setexpiration mybot lifetime\` - 10 years`
                    ].join('\n') }
                )
                .setFooter({ text: 'Minimum: 1 minute | Maximum: 10 years' });
            
            return message.reply({ embeds: [helpEmbed] });
        }

        const botName = args[0].toLowerCase();
        const timeArg = args.slice(1).join('');
        
        const parsed = parseExpirationInput(timeArg);
        
        if (!parsed.valid) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Invalid Duration')
                    .setDescription(`${parsed.error}\n\n**Valid formats:**\n\`7d\`, \`2w\`, \`1mo\`, \`1y\`, \`2w3d12h\`, \`30m\``)
                    .setFooter({ text: 'Minimum: 1 minute | Maximum: 10 years' })
            ]});
        }

        try {
            const expirationDate = getExpirationDate(parsed.ms);
            const durationDays = Math.ceil(parsed.ms / (24 * 60 * 60 * 1000));

            let botFound = false;
            let foundBotId = null;
            
            client.bots.forEach((botData, botId) => {
                if (botData.name && botData.name.toLowerCase() === botName) {
                    client.bots.set(botId, {
                        ...botData,
                        expirationDate: expirationDate.toISOString(),
                        expirationDays: durationDays,
                        expirationMs: parsed.ms,
                        expirationSetBy: message.author.id,
                        expirationSetAt: new Date().toISOString()
                    });
                    botFound = true;
                    foundBotId = botId;
                }
            });

            if (!botFound) {
                return message.reply({ embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription(`Bot \`${botName}\` not found in database`)
                ]});
            }

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Expiration Set Successfully')
                .addFields(
                    { name: 'Bot Name', value: `\`${botName}\``, inline: true },
                    { name: 'Duration', value: parsed.formatted, inline: true },
                    { name: 'Expires On', value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:F>`, inline: false },
                    { name: 'Time Remaining', value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:R>`, inline: false }
                )
                .setFooter({ text: `Set by ${message.author.tag}` })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Expiration set error:', error);
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Error')
                    .setDescription(`\`\`\`${error.message}\`\`\``)
            ]});
        }
    }
};
