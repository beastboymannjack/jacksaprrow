const { 
  SlashCommandBuilder, 
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription("Shows information about deadloom Music"),
  
  async execute(interaction) {
    const client = interaction.client;
    
    const embed = new EmbedBuilder()
      .setColor(0x00d4aa)
      .setTitle('<:deadloom:1430794772091768882> About deadloom Music')
      .setDescription(`<:white_musicnote:1430654046657843266> **deadloom Music** - A powerful Discord music bot designed to bring high-quality music streaming to your server. Enjoy seamless playback, custom playlists, and a rich set of features to enhance your listening experience.`)
      .addFields(
        {
          name: 'Key Features',
          value: '<:reply:1430796944258895913> High-quality music streaming\n<:reply:1430796944258895913> Custom playlists & favorites\n<:reply:1430796944258895913> Advanced audio filters\n<:reply:1430796944258895913> Queue management\n<:reply:1430796944258895913> Lyrics support\n<:reply:1430796944258895913> YouTube integration'
        },
        {
          name: 'Built With',
          value: '<:dots:1430789813564473365> Discord.js v14\n<:dots:1430789813564473365> Node.js\n<:dots:1430789813564473365> Lavalink\n<:dots:1430789813564473365> SQLite Database'
        }
      )
      .setImage("https://cdn.discordapp.com/attachments/1414256332592254986/1430798331524808724/standard_2.gif")
      .setFooter({ text: 'Developed with ❤️ by deadloom Development' });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=303600576574&scope=bot%20applications.commands`)
        .setLabel(`Invite Bot`)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setURL(`https://discord.gg/deadloom`)
        .setLabel(`deadloom Development`)
        .setStyle(ButtonStyle.Link)
    );

    await interaction.reply({
      embeds: [embed],
      components: [buttons]
    });
  }
};
