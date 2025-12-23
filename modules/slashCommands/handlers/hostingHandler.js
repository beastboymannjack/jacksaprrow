const { EmbedBuilder, MessageFlags } = require('discord.js');

const HOSTING_API_KEY = process.env.HOSTING_API_KEY || process.env.REMOTE_LOG_API_KEY || 'your-api-key-here';
const API_BASE_URL = 'http://localhost:5000/api/admin';

async function handleHostingStatus(interaction) {
    try {
        await interaction.deferReply();

        const statusResponse = await fetch(`${API_BASE_URL}/status`, {
            headers: { 'x-api-key': HOSTING_API_KEY }
        }).then(r => r.json()).catch(e => null);

        if (!statusResponse) {
            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Hosting Service Offline')
                .setDescription('Cannot reach the hosting service');
            
            return await interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('🖥️ Hosting Service Status')
            .addFields(
                { name: 'Status', value: '✅ Online', inline: true },
                { name: 'Uptime', value: statusResponse.uptime?.formatted || 'N/A', inline: true },
                { name: 'Port', value: statusResponse.port?.toString() || 'N/A', inline: true },
                { name: 'Running Bots', value: statusResponse.bots?.running?.toString() || '0', inline: true },
                { name: 'Total Bots', value: statusResponse.bots?.total?.toString() || '0', inline: true },
                { name: 'Archived Bots', value: statusResponse.bots?.archived?.toString() || '0', inline: true }
            )
            .setFooter({ text: `Last Updated: ${new Date().toLocaleString()}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('[HostingHandler] Error in handleHostingStatus:', error);
        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('❌ Error')
            .setDescription('Failed to fetch hosting status');
        
        await interaction.editReply({ embeds: [embed] }).catch(() => {});
    }
}

async function handleHostingRestart(interaction) {
    try {
        await interaction.deferReply();

        const graceful = interaction.options.getBoolean('graceful') ?? true;

        const restartResponse = await fetch(`${API_BASE_URL}/restart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': HOSTING_API_KEY
            },
            body: JSON.stringify({ graceful: graceful })
        }).then(r => r.json()).catch(e => null);

        if (!restartResponse) {
            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Restart Failed')
                .setDescription('Cannot reach the hosting service');
            
            return await interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('🔄 Service Restart Initiated')
            .setDescription(restartResponse.message || 'Restart process started')
            .addFields(
                { name: 'Graceful Mode', value: graceful ? '✅ Yes' : '❌ No', inline: true },
                { name: 'Bots Stopped', value: restartResponse.botsStoppedCount?.toString() || 'N/A', inline: true },
                { name: 'Restart Time', value: restartResponse.restartTime ? new Date(restartResponse.restartTime).toLocaleString() : 'N/A', inline: true }
            )
            .setFooter({ text: 'Restart in progress...' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('[HostingHandler] Error in handleHostingRestart:', error);
        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('❌ Error')
            .setDescription('Failed to restart hosting service');
        
        await interaction.editReply({ embeds: [embed] }).catch(() => {});
    }
}

async function handleHostingHealth(interaction) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const healthResponse = await fetch(`${API_BASE_URL}/health`, {
            headers: { 'x-api-key': HOSTING_API_KEY }
        }).then(r => r.json()).catch(e => null);

        if (!healthResponse) {
            await interaction.editReply({
                content: '❌ **Hosting Service is OFFLINE**'
            });
            return;
        }

        const uptime = healthResponse.uptime ? Math.floor(healthResponse.uptime / 60) : 0;
        await interaction.editReply({
            content: `✅ **Hosting Service is ONLINE**\n⏱️ Uptime: ${uptime} minutes`
        });
    } catch (error) {
        console.error('[HostingHandler] Error in handleHostingHealth:', error);
        await interaction.editReply({
            content: '❌ Error checking hosting service health'
        }).catch(() => {});
    }
}

module.exports = {
    handleHostingStatus,
    handleHostingRestart,
    handleHostingHealth
};
