const { Client, CommandInteraction, MessageEmbed, MessageSelectMenu, MessageActionRow, MessageButton } = require("discord.js");
const { red, green, blue, magenta, cyan, white, gray, black } = require("chalk");

module.exports = {
    name: "setup-rolepick",
   nodefer: true,
  category: "👑 Owner",
    description: "👑 Setup the role-picker menu",
    type: 'CHAT_INPUT',
    options: [
      {
        name: "channel",
        description: "Select a channel you want to send the role embed to",
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
      .setAuthor({ name: `Deadloom Role-Picker`, iconURL: `${client.user.displayAvatarURL()}` })
      .setColor('#2f3136')
      .setFooter(`Made by deadloom`) 
      .setDescription(`***Click the \`button\` below to pick some roles!***`)
      .setImage(`https://media.discordapp.net/attachments/983007106347180092/983345971347980368/350kb.gif`)
      const row = new MessageActionRow()
                        .addComponents(
                          new MessageButton()
        .setLabel(`Select a Self-Role`)
        .setCustomId(`azu_rolepicker`)
        .setStyle(`SECONDARY`)
                        );
      ch.send({ content: ` `, embeds: [emb], components: [row] });
      return interaction.editReply({ content: `The role system has successfully been setup view it here: ${ch}` })
    },
};
