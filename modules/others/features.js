
/**
 * STARTING THE MODULE WHILE EXPORTING THE CLIENT INTO IT
 * @param {*} client 
 */

 const { EmbedBuilder } = require("discord.js");
 const { createbot } = require("../../settings.json");
 const mainconfig = require("../../mainconfig");

 module.exports = async (client) => {
 
     let FeaturesChannelID = `${mainconfig.OrdersChannelID.FeaturesChannelID}`
     client.on('interactionCreate', async interaction => {
         if (!interaction.isStringSelectMenu()) return;
         if(interaction.message.channel.id == FeaturesChannelID) {
             if(interaction.values === "System Bot"){
                 interaction.reply({
                     embeds: [
                         new EmbedBuilder()
                         .setColor(client.config.color)
                         .setTitle("🤖 Bot Features of: __System BOT__ 🤖 ")
                         .setDescription("> *System Bot is a __Multifunctional Discord Bot__ and our Main-Most-Ordered Bot!*\n\n> *It has thousands of features, and get weekly updates!*")
                         .addFields({ name: "**Features Overview:**", value: `\`\`\`yml\n✅ 25 Ticket Systems\n✅ 25 Menu-Ticket-System Options\n✅ 25 Application Systems\n✅ Auto Support System\n✅ Automatic Updateting Roster\n✅ Advanced Welcome & Leave with Invites Tracking System\n✅ Audit Log, inline: and Join-Vc-Custom Messages\n✅ Join Vc Roles\n✅ 25 Join To Create Systems\n✅ 25 Serverstats Systems\n✅ Automatic Server Backups\n✅ Anti Nuke\n✅ Anti-Spam, Anti-Links, Anti-Discord, Anti-Caps\n✅ Blacklisted-Words & Ghost-Ping Detector\n✅ Automatic Warns\n✅ Advanced Warn System with adjustable Punishments\n✅ Reaction Roles\n✅ Custom Commands & Keywords System\n✅ Twitter, Youtube, Twitch Poster & Live Roles\n✅ Rank System with RANKING ROLES\n✅ Multiple Languages\n✅ 100+ Music & Filter Commands\n✅ Fun, Minigame, NSFW Commands\n✅ Advanced Economy System\n✅ 600+ Commands, 100+ Slash Commands, 250+ Systems\n\`\`\`` })
                         .addFields({ name: "**Price Overview:**", value: `> Free Option:**\`6 Invites\`**\n\n> Monthly Option**\`1€ / 30 Days\`**\n\n> Yearly Option: **\`4€ / Year\`**` })
                     ],
                     ephemeral: true
                 });
             }
             if(interaction.values === "Mod Mail Bot"){
                 interaction.reply({
                     embeds: [
                         new EmbedBuilder()
                         .setColor(client.config.color)
                         .setTitle("📨 Bot Features of: __MODMAIL BOT__ 📨")
                         .setDescription("> *Modmail Bot is a __Modmail Bot__ (DM-TICKET-SYSTEM)!*\n\n> *It has support for MULTIGUILDS and is crazy fast!\nAutomatic, HTML BASED Ticket Logs and very useful, for shops and little Discord Servers!*")
                         .addFields({ name: "**Features Overview:**", value: `\`\`\`yml\n✅ Multiple Guilds\n✅ Fast Ticket Creation\n✅ Ticket Bans\n✅ Owner Commands\n✅ Clera Ticket Logs\n✅ Fully customiceable\n\`\`\`` })
                         .addFields({ name: "**Price Overview:**", value: `> Free Option:**\`3 Invites\`**\n\n> Monthly Option**\`1€ / 100 Days\`**\n\n> Yearly Option: **\`2€ / Year\`**` })
                     ],
                     ephemeral: true
                 });
             }
 
             if(interaction.values === "Waitingroom Bot"){
                 interaction.reply({
                     embeds: [
                         new EmbedBuilder()
                         .setColor(client.config.color)
                         .setTitle("🕐 Bot Features of: __WAITINGROOM BOT__ 🕐")
                         .setDescription("> *Waitingroom Bot is a __Waitingroom Bot__ and can be used 24/7!*\n\n> *With the \`!customsetup [LINK]\` you can setup a 24/7 Playing Playlist for your wished Voice-Channel!*")
                         .addFields({ name: "**Features Overview:**", value: `\`\`\`yml\n✅ 24/7 Music\n✅ Instant Fast, inline: cristal Clear Audio-Playback\n✅ Support for Youtube, Spotify, Soundcloud, Apple Music and more!\n✅ Supports Radio Stations\n✅ Stage Channel & Thread Support\n✅ customsetup ... setup custom links for 24/7 Playback\n\`\`\`` })
                         .addFields({ name: "**Price Overview:**", value: `> Free Option:**\`3 Invites\`**\n\n> Monthly Option**\`1€ / 100 Days\`**\n\n> Yearly Option: **\`2€ / Year\`**` })
                     ],
                     ephemeral: true
                 });
             }
         }
     })
 }
 