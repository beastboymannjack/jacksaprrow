const { Client, CommandInteraction, MessageEmbed, MessageSelectMenu, MessageActionRow, MessageButton } = require("discord.js");
const { red, green, blue, magenta, cyan, white, gray, black } = require("chalk");

module.exports = {
    name: "setup-codesembed",
   nodefer: false,
  category: "👑 Owner",
    description: "👑 Setup the Code-Packages Embed",
    type: 'CHAT_INPUT',
    options: [
      {
        name: "channel",
        description: "Select a channel you want to send the Code-Packages Embed to",
        type: "CHANNEL",
        required: true,
      }
    ], 
    run: async (client, interaction, args) => {
      let ch = interaction.options.getChannel('channel');
      let msg = await interaction.followUp(`Fetching..`);

      if(!client.config.developers.includes(interaction.user.id)) return msg.edit(`🔒 You must be an owner to use this command!`)
      if(ch.type != 'GUILD_TEXT') return msg.edit(`🚩 You must provide a channel, and not category or voice channel!`)
      

      
      const row = new MessageActionRow()
                        .addComponents(
                          new MessageButton()
        .setCustomId(`azu_reload_codes`)
        .setEmoji(`870013196591837214`)
        .setStyle(`DANGER`)
                        );
      ch.send({ content: ` `, embeds: [client.codesEmbed], components: [row] });
      return msg.edit({ content: `💖 The codes embed has successfully been sent! View it here: ${ch}` })
    },
};
