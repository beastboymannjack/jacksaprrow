const { Client, CommandInteraction, MessageEmbed, MessageSelectMenu, MessageActionRow, MessageButton } = require("discord.js");
const { red, green, blue, magenta, cyan, white, gray, black } = require("chalk");

module.exports = {
    name: "setup-prices",
   nodefer: true,
  category: "👑 Owner",
    description: "👑 Setup the prices menu",
    type: 'CHAT_INPUT',
    options: [
      {
        name: "channel",
        description: "Select a channel you want to send the prices embed to",
        type: "CHANNEL",
        required: true,
      }
    ], 
    run: async (client, interaction, args) => {
       await interaction.deferReply({ ephemeral: true });
      let ch = interaction.options.getChannel('channel');
      let msg = await interaction.followUp(`Fetching..`);

      if(!client.config.developers.includes(interaction.user.id)) return interaction.editReply(`🔒 You must be an owner to use this command!`)
      if(ch.type != 'GUILD_TEXT') return interaction.editReply(`🚩 You must provide a channel, and not category or voice channel!`)
 
      const emb = new MessageEmbed()
      .setAuthor({ name: `BOTS / PRICES / FEATURES`, iconURL: `${client.user.displayAvatarURL()}` })
      .setColor(`WHITE`)
      .setDescription(`
**Want to know what our bot prices are?** 💰

🎉 **FREE BOT HOSTING** - Get a free bot host for only **\`5 invites\`**!

💳 **CUSTOM BOT ORDER** - Order a custom bot:
• Price: **\`$6/month\`** (paid subscription)
• Duration: Permanent hosting + monthly support
• Features: Custom coding, updates, and maintenance

If you wish to actually order the **source code** or **custom bot**, then the prices will be listed in the Dropdown below! Select a bot from there, and it will describe the **features and pricing**!
`)
      const row = new MessageActionRow()
                        .addComponents(
                          new MessageSelectMenu()
                          .setCustomId('select_viewbots')
                          .setPlaceholder('Cilck an Option to view a Certian bot\'s info')
                          .addOptions([
          { label: `Suggestions Bot`, description: `View Information about the Suggestions bot`, value: `bot_suggestions`, emoji: `☂️` },
          { label: `Fun & NSFW Bot`, description: `View Information about the Fun & NSFW bot`, value: `bot_fun_nsfw`, emoji: `🔞` },
          { label: `Chat Bot`, description: `View Information about the Chat bot`, value: `bot_chat`, emoji: `💬` },
        ]),
                        );
      ch.send({ content: ` `, embeds: [emb], components: [row] });
      return interaction.editReply({ content: `💖 The prices system has successfully been setup view it here: ${ch}` })
    },
};
