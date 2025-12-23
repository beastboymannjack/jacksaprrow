const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-category')
        .setDescription('Manage ticket categories for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        const isBotOwner = interaction.client.application.owner?.id === interaction.user.id ||
                          (interaction.client.application.owner?.ownerId && 
                           interaction.user.id === interaction.client.application.owner.ownerId);
        
        if (!isOwner && !isBotOwner && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Only server owners, bot owners, or administrators can use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        const serverConfig = client.database.getServerConfig(interaction.guild.id);
        const enabledCategories = serverConfig.enabledCategories || [];
        
        const stateKey = `${interaction.guild.id}_${interaction.user.id}`;
        
        client.categorySelections = client.categorySelections || {};
        client.categorySelections[stateKey] = [...enabledCategories];
        
        client.categoryPages = client.categoryPages || {};
        client.categoryPages[stateKey] = 0;

        const components = buildCategoryPage(interaction, client, 0);
        
        await interaction.reply({
            embeds: components.embed,
            components: components.rows,
            flags: MessageFlags.Ephemeral
        });
    }
};

function buildCategoryPage(interaction, client, pageNumber) {
    const stateKey = `${interaction.guild.id}_${interaction.user.id}`;
    const serverConfig = client.database.getServerConfig(interaction.guild.id);
    const enabledCategories = client.categorySelections?.[stateKey] || serverConfig.enabledCategories || [];
    const customCategories = serverConfig.customCategories || {};
    const allCategories = { ...config.ticketCategories, ...customCategories };
    
    const allCategoryIds = Object.keys(allCategories);
    const totalCategories = allCategoryIds.length;
    const categoriesPerPage = 25;
    const totalPages = Math.ceil(totalCategories / categoriesPerPage);
    
    const currentPage = Math.max(0, Math.min(pageNumber, totalPages - 1));
    const startIndex = currentPage * categoriesPerPage;
    const endIndex = Math.min(startIndex + categoriesPerPage, totalCategories);
    
    const pageCategories = allCategoryIds.slice(startIndex, endIndex);

    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('📋 Ticket Category Manager')
        .setDescription(
            `**Total Categories:** ${totalCategories}\n` +
            `**Currently Selected:** ${enabledCategories.length}\n` +
            `**Page:** ${currentPage + 1} of ${totalPages}\n\n` +
            `Use the dropdown menu to select/deselect categories.\n` +
            `Selected items = **enabled** categories.`
        )
        .setFooter({ text: `Showing ${startIndex + 1}-${endIndex} of ${totalCategories} categories` })
        .setTimestamp();

    const selectMenuOptions = pageCategories.map(id => {
        const cat = allCategories[id];
        const isEnabled = enabledCategories.includes(id);
        return {
            label: cat.label.slice(0, 100),
            value: id,
            description: cat.description.slice(0, 100),
            emoji: cat.emoji,
            default: isEnabled
        };
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`category_toggle_${interaction.id}`)
        .setPlaceholder('Select categories to enable')
        .setMinValues(0)
        .setMaxValues(selectMenuOptions.length)
        .addOptions(selectMenuOptions);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);

    const navButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`category_page_prev_${interaction.id}`)
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
        new ButtonBuilder()
            .setCustomId(`category_page_next_${interaction.id}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages - 1)
    );

    const actionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`category_save_${interaction.id}`)
            .setLabel('💾 Save Changes')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`category_enable_all_${interaction.id}`)
            .setLabel('✅ Enable All')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`category_disable_all_${interaction.id}`)
            .setLabel('❌ Disable All')
            .setStyle(ButtonStyle.Danger)
    );

    return {
        embed: [embed],
        rows: [row1, navButtons, actionButtons]
    };
}

module.exports.buildCategoryPage = buildCategoryPage;
