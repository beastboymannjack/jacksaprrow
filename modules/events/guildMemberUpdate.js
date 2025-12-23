//IMPORTING NPM PACKAGES
const { EmbedBuilder } = require('discord.js');
const emoji = require("../../emoji");
/**
 * STARTING THE MODULE WHILE EXPORTING THE CLIENT INTO IT
 * @param {*} client 
 */

module.exports = async (client) => {
    const mainconfig = require("../../mainconfig")
    

    client.on("guildMemberUpdate", async (oM, nM) => {
        let boostLogChannelId = `${mainconfig.BoostLogChannel}`
        let boostLogChannel = nM.guild.channels.cache.get(boostLogChannelId);
        if(!boostLogChannel) boostLogChannel = await nM.guild.channels.fetch(boostLogChannelId).catch(()=>{}) || false;
        
        let stopBoost = new EmbedBuilder()
            .setFooter({ text: "ID: " + nM.user.id })
            .setTimestamp()
            .setAuthor({ name: nM.user.tag, iconURL: nM.user.displayAvatarURL({ dynamic: true }) })
            .setColor(0xFF0000)
            .setDescription(`<a:Server_Boosts:933787999387390032>  ${nM.user} **stopped Boosting us..** <:Cat_Sad:964621326012792853>`)
        let startBoost = new EmbedBuilder()
            .setFooter({ text: "ID: " + nM.user.id })
            .setTimestamp()
            .setAuthor({ name: nM.user.tag, iconURL: nM.user.displayAvatarURL({ dynamic: true }) })
            .setColor(0x00FF00)
            .setDescription(`<a:Server_Boosts:933787999387390032> ${nM.user} **has boosted us!** <a:Light_Saber_Dancce:934497418387521586>`)
        //if he/she starts boosting
        if(boostLogChannel && !oM.premiumSince && nM.premiumSince) {
            boostLogChannel.send({embeds: [startBoost]}).catch(console.warn);
            //send the MEMBER a DM
            nM.send("❤️ Thank you for Boosting our Server!!\n\n❤️ ***We really appreciate it!***").catch(console.warn)
        }
        //if he/she stops boosting
        if(boostLogChannel && oM.premiumSince && !nM.premiumSince) {
            boostLogChannel.send({embeds: [stopBoost]}).catch(console.warn)
        }

        // Staff Showcase - announce new staff members
        const staffRoles = [
            mainconfig.ServerRoles?.SupporterRoleId,
            mainconfig.ServerRoles?.BotCreatorRoleId,
            mainconfig.ServerRoles?.ChiefBotCreatorRoleId,
            mainconfig.ServerRoles?.FounderId
        ].filter(Boolean);

        const roleNames = {
            [mainconfig.ServerRoles?.SupporterRoleId]: 'Supporter',
            [mainconfig.ServerRoles?.BotCreatorRoleId]: 'Bot Creator',
            [mainconfig.ServerRoles?.ChiefBotCreatorRoleId]: 'Chief Bot Creator',
            [mainconfig.ServerRoles?.FounderId]: 'Founder'
        };

        for (const roleId of staffRoles) {
            const hadRole = oM.roles.cache.has(roleId);
            const hasRole = nM.roles.cache.has(roleId);
            
            if (!hadRole && hasRole) {
                const roleName = roleNames[roleId] || 'Staff Member';
                const role = nM.guild.roles.cache.get(roleId);
                
                let showcaseChannel = nM.guild.channels.cache.find(c => 
                    c.name.toLowerCase().includes('staff-announce') ||
                    c.name.toLowerCase().includes('welcome') ||
                    c.name.toLowerCase().includes('general')
                );
                
                if (!showcaseChannel) showcaseChannel = nM.guild.systemChannel;
                
                if (showcaseChannel && showcaseChannel.isText()) {
                    const embed = new EmbedBuilder()
                        .setColor(role?.color || "#57F287")
                        .setTitle("🎉 Welcome to the Team!")
                        .setDescription(`Please welcome **${nM.user.tag}** as our newest **${roleName}**!`)
                        .setThumbnail(nM.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        .addFields({ name: "👤 Member", value: `<@${nM.id}>`, inline: true })
                        .addFields({ name: "📋 Position", value: roleName, inline: true })
                        .addFields({ name: "📅 Joined Server", value: `<t:${Math.floor(nM.joinedTimestamp / 1000)}:R>`, inline: true })
                        .setFooter({ text: "Staff Management System", iconURL: nM.guild.iconURL({ dynamic: true }) })
                        .setTimestamp();

                    showcaseChannel.send({ embeds: [embed] }).catch(e => console.log(`[StaffShowcase] Error: ${e.message}`));
                }

                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor("#5865F2")
                        .setTitle(`🎉 Congratulations, ${nM.user.username}!`)
                        .setDescription(`You've been promoted to **${roleName}** in **${nM.guild.name}**!`)
                        .addFields({ name: "📚 Getting Started", value: "• Check the handbook with `,handbook list`\n• Use `,ask <question>` for AI help\n• View the dashboard with `,dashboard`" })
                        .setTimestamp();
                    nM.user.send({ embeds: [dmEmbed] }).catch(() => {});
                } catch (e) {}

                if (client.staffstats) {
                    const statsKey = `${nM.guild.id}-${nM.id}`;
                    client.staffstats.ensure(statsKey, {
                        joinedStaff: new Date(),
                        role: roleName,
                        actions: 0
                    });
                }

                console.log(`[StaffShowcase] ${nM.user.tag} promoted to ${roleName}`);
                break;
            }
        }
    });
  
}

