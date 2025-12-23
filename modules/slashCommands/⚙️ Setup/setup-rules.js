const { Client, CommandInteraction, MessageEmbed, MessageSelectMenu, MessageActionRow, MessageButton } = require("discord.js");
const { red, green, blue, magenta, cyan, white, gray, black } = require("chalk");
const model = require("../../models/rules")
module.exports = {
    name: "setup-rules",
   nodefer: true,
  category: "👑 Owner",
    description: "👑 Setup the rules list",
    type: 'CHAT_INPUT',
    options: [
      {
        name: "channel",
        description: "Select a channel you want to send the rules to",
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
      
      const btn = new MessageActionRow()
      .addComponents([
        new MessageButton()
        .setEmoji(`✅`)
        .setStyle(`SECONDARY`)
        .setCustomId(`rules_react`)
        .setLabel(`0`),
        new MessageButton()
        .setLabel(`Tutorial`)
        .setStyle(`SUCCESS`)
        .setEmoji(`👋`)
        .setCustomId(`rules_tutorial`),
        new MessageButton()
        .setStyle(`PRIMARY`)
        .setLabel(`Verify`)
        .setEmoji(`⚡`)
        .setCustomId(`verify_rules`)
      ])
      
      ch.send({ content: `
<:staff:987783030653481032> **__Here are the Azury Server-Rules and ToS!__** <:staff:987783030653481032>

**Rule <:Channel:1085601045742358579>001:**
> *Spamming is not permitted anywhere in this Discord, as we want to give everyone and opportunity to talk without being intimidated. We also discourage using bot commands outside of the <#1085248929211351191> channel, as it can cause unnecessary clutter in the channels. Furthermore the use of copypastas or other clutter is not permitted.*

**Rule <:Channel:1085601045742358579>002:**
> *We expect everyone to respect everyone here. Whether they're a customer or a member of the Staff Team. Chances are if you respect other people they'll respect you back! We'd like to think that nobody would discriminate against race, gender, ethnicity, appearance, or sexual orientation and this also comes under our rule of respect. Just respect people! Respect other people's feelings and beliefs. It might mean nothing to you, but it could mean everything to them.*

**Rule <:Channel:1085601045742358579>003:**
> *Please do __NOT__ ping people unless they want you to, or they don't care. This also includes the Staff Members. Only ping them if the situation is urgent, or you are talking to them in Chat/General.*`});
      ch.send({ content: `**Rule <:Channel:1085601045742358579>004:**
> *Cursing, being rude, ect. is NOT allowed here at **${interaction.guild.name}**. This might not be rude to you, but it is certianly rude to others.*

**Rule <:Channel:1085601045742358579>005:**
> *Please do not beg for anything in this server this includes, Nitro, Codes, Money, ect. Not many people would just **give** their hard work away for Nothing. If you have time to beg, you have time to do it yourself!*

**Rule <:Channel:1085601045742358579>006:**
> *Please do __NOT__ troll in VC's. Some might think its funny to Scream, and Harrass other users in Voice-Channels, but it is not! Its annoying and rude. Doing so will recive in a BAN!*

**Rule <:Channel:1085601045742358579>007:**
> *Do __NOT__ spam Order Tickets, Support, Claim, ect. If you want to Order a Bot, make sure to open a **Order-Ticket** and send something in the Ticket! If you don't send something, this counts as spam and results in a WARN. (This is also the same for Support and Claim Tickets)*
`})
      ch.send({ content: `\`\`\`yml
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
\`\`\`

**__Want to get Access to Verified-Only Channels?__**
> *Click the "Verify" button below to get the role (You can still access the server without it, but won't have access to ALL channels.)*

**__Need a Quick-Tutorial on the Server?__**
> To get a Quick-Tutorial, Click the "Tutorial" button Bellow to get Information.`, components: [btn] }).then((m) => { new model({ MessageId: m.id }).save() });
      return interaction.editReply({ content: `💖 The rules-menu has successfully been setup view it here: ${ch}` })
    },
};
