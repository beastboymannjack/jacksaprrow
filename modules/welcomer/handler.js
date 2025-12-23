const { AttachmentBuilder } = require('discord.js');
const { loadImage, createCanvas } = require('canvas');
const path = require('path');
const moment = require('moment');
const db = require('./database');

const welcomerConfig = require('./config');

const guildInvites = new Map();

async function initializeWelcomer(client) {
    console.log('[Welcomer] Initializing welcome system...');
    
    const { serverID, infoChannel } = welcomerConfig;
    
    if (!serverID || !infoChannel) {
        console.warn('[Welcomer] Missing configuration. Please set WELCOMER_SERVER_ID and WELCOMER_INFO_CHANNEL');
        return false;
    }

    try {
        await reloadFetchingInvite(client);
        await updateVoiceChannelName(client);
        console.log('[Welcomer] Welcome system initialized successfully');
        return true;
    } catch (err) {
        console.error('[Welcomer] Initialization error:', err);
        return false;
    }
}

async function updateVoiceChannelName(client) {
    const { serverID, infoChannel } = welcomerConfig;
    
    try {
        const guild = client.guilds.cache.get(serverID);
        if (!guild) return console.error('[Welcomer] Guild not found!');

        const voiceChannel = guild.channels.cache.get(infoChannel);
        if (!voiceChannel) return console.error('[Welcomer] Voice channel not found!');

        const members = await guild.members.fetch();
        if (!members) return console.error('[Welcomer] No members found!');

        const memberCount = members.filter((user) => user.user.bot === false).size;
        await voiceChannel.setName(`・Members : ${memberCount}`);
        console.log(`[Welcomer] Updated member count: ${memberCount}`);
    } catch (err) {
        console.error('[Welcomer] Error updating voice channel:', err);
    }
}

async function reloadFetchingInvite(client) {
    const { serverID } = welcomerConfig;
    
    try {
        guildInvites.set(serverID, []);
        const guild = client.guilds.cache.get(serverID);
        if (!guild) return;

        const invites = await guild.invites.fetch();
        console.log('[Welcomer] Invite tracking loaded');
        invites.each(inv => {
            guildInvites.get(serverID).push({
                URL: inv.code,
                Inviter: inv.inviter?.id || 'Unknown',
                Uses: inv.uses || 0
            });
        });
    } catch (err) {
        console.error('[Welcomer] Error loading invites:', err);
    }
}

const sendCanvasMessage = async (type, channel, member) => {
    try {
        const dimensions = type === 'leave' ? [500, 296] : [1160, 361];
        const canvas = createCanvas(...dimensions);
        const ctx = canvas.getContext('2d');
        
        const imagePath = path.join(__dirname, `${type}.png`);
        const background = await loadImage(imagePath);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        const name = member.user.globalName || member.user.username;
        const maxWidth = 350;
        let fontSize = 60;
        ctx.font = `bold ${fontSize}px sans-serif`;

        while (ctx.measureText(name).width > maxWidth && fontSize > 10) {
            fontSize -= 1;
            ctx.font = `bold ${fontSize}px sans-serif`;
        }

        ctx.fillStyle = '#fff';
        const textWidth = ctx.measureText(name).width;
        const centerX = canvas.width / 2 + 180;
        const nameY = type === 'leave' ? 160 : 120;
        ctx.fillText(name, centerX - textWidth / 2, nameY);

        ctx.font = 'bold 30px sans-serif';
        const idText = `${member.id}`;
        const idWidth = ctx.measureText(idText).width;
        const idX = canvas.width / 2 - idWidth / 2 - 10;
        const idY = type === 'leave' ? 220 : 250;
        ctx.fillText(idText, idX, idY);

        const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
        const avatarSize = type === 'leave' ? 218 : 340;
        const radius = type === 'leave' ? 109 : 170;
        const avatarX = type === 'leave' ? 20 : 11;
        const avatarY = type === 'leave' ? 73 : 10;

        ctx.beginPath();
        ctx.arc(avatarX + radius, avatarY + radius, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: `${type}-image.png` });
        await channel.send({ files: [attachment] }).catch(err => 
            console.log(`[Welcomer] Canvas error [${type}]:`, err.message)
        );
    } catch (err) {
        console.error(`[Welcomer] Error creating canvas message:`, err);
    }
};

async function handleGuildMemberAdd(member, client) {
    const { serverID, welcomeChannel, memberRole } = welcomerConfig;
    
    if (member.guild.id !== serverID) return;

    const guild = member.guild;
    const welcomeCh = guild.channels.cache.get(welcomeChannel);
    const inviterLog = [];
    const oldInvites = guildInvites.get(serverID) || [];

    try {
        await updateVoiceChannelName(client);
        await db.saveUser(member.user.id, member.user.username);
        await db.updateServerState(member.user.id, "IN");

        if (memberRole) {
            await member.roles.add(memberRole).catch(error => {
                console.log(`[Welcomer] Couldn't assign role to ${member.user.tag}: ${error.message}`);
            });
        }

        const newInvitesRaw = await guild.invites.fetch();
        const newInvites = Array.from(newInvitesRaw.values()).map(inv => ({
            URL: inv.code,
            Inviter: inv.inviter?.id || 'Unknown',
            Uses: inv.uses || 0
        }));

        for (const oldInv of oldInvites) {
            const matched = newInvites.find(newInv =>
                newInv.URL === oldInv.URL &&
                newInv.Inviter === oldInv.Inviter &&
                newInv.Uses !== oldInv.Uses
            );
            if (matched) {
                inviterLog.push(matched);
                oldInv.Uses = matched.Uses;
            }
        }

        if (inviterLog.length > 0) {
            const inviterID = inviterLog[0].Inviter;
            const currentInvites = (await db.getInvites(inviterID))?.Invites || 0;
            await db.updateinvites(inviterID, currentInvites + 1);
            await db.updateInviterUser(member.user.id, inviterID);
        }

        await reloadFetchingInvite(client);

        if (welcomeCh) {
            await sendCanvasMessage('welcome', welcomeCh, member);

            if (inviterLog.length > 0) {
                const inviterID = inviterLog[0].Inviter;
                const totalInvites = (await db.getInvites(inviterID))?.Invites || 1;
                await welcomeCh.send(
                    `**Welcome To __${guild.name}__**\n**User : ${member}**\n**Invited By <@${inviterID}> - Total Invites \`${totalInvites}\`**`
                );
            } else {
                await welcomeCh.send(`**Welcome To __${guild.name}__**\n**User : ${member}**`);
            }
        }

        const backupRoles = (await db.getRoles(member.user.id))?.Roles;
        if (backupRoles) {
            const roleIDs = backupRoles.split(',').filter(Boolean);
            for (const roleId of roleIDs) {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    try {
                        await member.roles.add(role);
                    } catch (err) {
                        console.log(`[Welcomer] Failed to restore role ${role.name} to ${member.user.tag}`);
                    }
                }
            }
            await db.updateBackupRoles(member.user.id, null);
        }
    } catch (err) {
        console.error(`[Welcomer] Error handling new member ${member.user.tag}:`, err);
    }
}

async function handleGuildMemberRemove(member, client) {
    const { serverID, leftChannel } = welcomerConfig;
    
    if (member.guild.id !== serverID) return;

    const guild = member.guild;
    const leaveCh = guild.channels.cache.get(leftChannel);
    const userId = member.user.id;

    try {
        await updateVoiceChannelName(client);

        const backupRolesArr = member.roles.cache
            .filter(role => role.id !== guild.id && role.id !== welcomerConfig.memberRole)
            .map(role => role.id);

        const backupRoles = backupRolesArr.length > 0 ? backupRolesArr.join(',') : null;
        await db.updateBackupRoles(userId, backupRoles);

        const userData = await db.getUser(userId);
        if (userData) {
            await db.updateServerState(userId, "Left");

            if (userData.By && userData.By !== "0") {
                const inviterData = await db.getInvites(userData.By);
                const updatedCount = (inviterData?.Invites || 1) - 1;
                await db.updateinvites(userData.By, Math.max(updatedCount, 0));
            }
        }

        if (leaveCh) {
            const leaveText = `**${member.user.globalName || member.user.username} Left The Server**`;
            await sendCanvasMessage('left', leaveCh, member);
            await leaveCh.send(leaveText);
        }
    } catch (err) {
        console.error(`[Welcomer] Error handling member leave for ${member.user.tag}:`, err);
    }
}

module.exports = {
    initializeWelcomer,
    handleGuildMemberAdd,
    handleGuildMemberRemove,
    updateVoiceChannelName,
    reloadFetchingInvite
};
