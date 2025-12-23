const { Client, CommandInteraction, MessageEmbed, MessageSelectMenu, MessageActionRow, MessageButton } = require("discord.js");
const { red, green, blue, magenta, cyan, white, gray, black } = require("chalk");

module.exports = {
    name: "setup-order",
   nodefer: true,
  category: "👑 Owner",
    description: "👑 Setup the order menu",
    type: 'CHAT_INPUT',
    options: [
      {
        name: "channel",
        description: "Select a channel you want to send the order embed to",
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


      let people_who_support = []
      let members = interaction.guild.roles.cache.get(client.config.staffroles.customersupport).members.map(m => m)
      members.forEach(m=> {
        //console.log(`${m.tag}  >>  ${m.presence?.status}`)
        if(m.presence?.status == null) return;
        people_who_support.push(m)
      })
      
      
      const emb = new MessageEmbed()
      .setAuthor({ name: `TICKETS & ORDERS`, iconURL: `${client.user.displayAvatarURL()}` })
      .setColor(`WHITE`)

      .setFooter(`Ticket System | Free Codes/Bots | Simple Support\nDeadloom Development`, interaction.guild.iconURL()) 
      .setDescription(`Need support? Want to order a bot or code? Why not open a ticket channel, from the menu below, we provide 24/7 , fast & quick support!\n\n _Thanks for cooperating with us along with our journey here @ Deadloom_`)
        .addField(` **${people_who_support.length} - Online Staff Members:**`, `>>> ${people_who_support.join("‚ ")}`) 
      const row = new MessageActionRow()
                        .addComponents(
                          new MessageSelectMenu()
                          .setCustomId('select_ord')
                          .setPlaceholder('Order a bot / Get support / Claim a giveaway')
                          .addOptions([
          { label: `General Support`, description: `Need help? Get some general support on our bots /or server!`, value: `ord_support`, emoji: `937441297722146836` },
          { label: `Staff Apply`, description: `Want to Apply as a Staff member? Fill out the Application menu!`, value: `azu_apply`, emoji: "897466419103555615"},
          { label: `Giveaway claim`, description: `Won a giveaway? Open a ticket here to claim your reward!`, value: `ord_giveaway`, emoji: `937441297365614603` },
          { label: `Bot order`, description: `Want to order a bot? Click below to order one of our bots!`, value: `ord_order`, emoji: `937441297923469342` },
        ]),
                        );
      ch.send({ content: ` `, embeds: [emb], components: [row] });
      return interaction.editReply({ content: `The order system has successfully been setup view it here: ${ch}` })
    },
};
