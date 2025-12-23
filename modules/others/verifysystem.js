const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require("discord.js");
const mainconfig = require("../../mainconfig");

module.exports = async (client) => {
    const RulesChannel = mainconfig.RulesChannel ? `${mainconfig.RulesChannel.toString()}` : null;
    const verifiedRoleId = mainconfig.MemberRoleID ? `${mainconfig.MemberRoleID.toString()}` : null;

    client.on("interactionCreate", async (interaction) => {
        if (!interaction?.isButton()) return;
        const { member, channel, message, guild } = interaction;
        
        if (interaction?.customId === "verify_member") {
            const roleId = verifiedRoleId || mainconfig.ServerRoles?.MemberRoleId;
            if (!roleId) {
                return interaction.reply({ content: "Verification role not configured. Please contact an admin.", ephemeral: true });
            }
            if (member.roles.cache.has(roleId)) {
                return interaction.reply({ content: "You are already verified!", ephemeral: true });
            }
            try {
                await member.roles.add(roleId);
                return interaction.reply({ content: "You have been verified! Welcome to the server.", ephemeral: true });
            } catch (e) {
                console.error("[Verify] Error adding role:", e);
                return interaction.reply({ content: "Could not verify you. Please contact an admin.", ephemeral: true });
            }
        }
        
        if (channel.id == RulesChannel?.toString() && interaction?.customId == "milratoverify") {
            if (member.roles.cache.has(verifiedRoleId)) {
                return interaction?.reply({
                    ephemeral: true,
                    content: "❌ You are already Verified"
                }).catch(() => { });
            }
            interaction?.reply({
                ephemeral: true,
                content: "**I will now ask you 5 Questions, please answer them CORRECTLY (Read the RULES) In Order to get ACCESS to this SERVER!**\n> *Keep in Mind that Capitalization might be important sometimes!*",
                components: [
                    new ActionRowBuilder().addComponents([
                        new ButtonBuilder().setLabel("Okay, Go ahead!").setStyle(ButtonStyle.Danger).setCustomId("okay-go-ahead"),
                        new ButtonBuilder().setLabel("No Sorry, No verification").setStyle(ButtonStyle.Success).setCustomId("no-verification"),
                    ])
                ]
            }).catch(() => { });
        }
        // ASK FIRST QUESTION
        if (channel.id == RulesChannel.toString() && interaction?.customId == "okay-go-ahead") {
            interaction?.update({
                ephemeral: true,
                content: "**First Question:**\n> What is the __Keyword__ inside of the RULES?",
                components: [
                    new ActionRowBuilder().addComponents([
                        new ButtonBuilder().setLabel("Key2022deadloom <3").setStyle(ButtonStyle.Secondary).setCustomId("Key2022deadloom <3"),
                        new ButtonBuilder().setLabel("Keydeadloom <32022").setStyle(ButtonStyle.Secondary).setCustomId("Keydeadloom <32022"),
                        new ButtonBuilder().setLabel("Keydeadloom <32021").setStyle(ButtonStyle.Secondary).setCustomId("Keydeadloom <32021"),
                        new ButtonBuilder().setLabel("Key2021deadloom <3").setStyle(ButtonStyle.Secondary).setCustomId("Key2021deadloom <3"),
                        new ButtonBuilder().setLabel("KeyOfdeadloom <3").setStyle(ButtonStyle.Secondary).setCustomId("KeyOfdeadloom <3"),
                    ]),
                    new ActionRowBuilder().addComponents([
                        new ButtonBuilder().setLabel("Cancel Verification").setStyle(ButtonStyle.Danger).setCustomId("Cancel_Verify")
                    ]),
                ]
            }).catch(() => { });
        }

        if (channel.id == rulesChannel && interaction?.customId.startsWith("Ping")) {
            if (interaction?.customId == "PingNo" || interaction?.customId == "PingTickets2") {
                member.roles.add(verifiedRoleId).then(() => {
                    interaction?.update({
                        ephemeral: true,
                        content: "👍 **Good Job!**\n> You successfully Verified yourself and I granted access to you for **deadloom <3**\n> :wave: Enjoy! Just incase you need to know something check out <#924696982264610846>",
                        components: [],
                    }).catch(() => { });
                }).catch((e) => {
                    console.log(e)
                    interaction?.update({
                        ephemeral: true,
                        content: "❌ Something went terrible Wrong I'm Sorry please check out <#924718628732031026>\n> **Please send a SCREENSHOT of this MESSAGE too**, so that we know you should have succesfully solved the Verification!",
                        components: [],
                    }).catch(() => { });
                });
            } else {
                interaction?.update({
                    ephemeral: true,
                    content: ":x: **WRONG ANSWER**\n> Verification Cancelled, Make sure to Read the RULES AGAIN!\n> Tipp: ||Check Rule **§005** __very carefully__!||",
                    components: [
                        new ActionRowBuilder().addComponents([
                            new ButtonBuilder().setLabel("Yes, I am").setStyle(ButtonStyle.Danger).setCustomId("PingYes").setDisabled(),
                            new ButtonBuilder().setLabel("Only in Tickets").setStyle(ButtonStyle.Danger).setCustomId("PingTickets").setDisabled(),
                            new ButtonBuilder().setLabel("No, I am not").setStyle(ButtonStyle.Success).setCustomId("PingNo").setDisabled(),
                            new ButtonBuilder().setLabel("In Tickets if no Response").setStyle(ButtonStyle.Success).setCustomId("PingTickets2").setDisabled(),
                            new ButtonBuilder().setLabel("Only when it's urgent").setStyle(ButtonStyle.Danger).setCustomId("PingUrgent").setDisabled(),
                        ]),
                    ]
                }).catch(() => { });
            }
        }

        if (channel.id == rulesChannel && interaction?.customId.startsWith("Key")) {
            if (interaction?.customId == "Key2022deadloom <3") {
                interaction?.update({
                    ephemeral: true,
                    content: "**SECOND Question:**\n> Am I allowed to ping People?",
                    components: [
                        new ActionRowBuilder().addComponents([
                            new ButtonBuilder().setLabel("Yes, I am").setStyle(ButtonStyle.Secondary).setCustomId("PingYes"),
                            new ButtonBuilder().setLabel("No, I am not").setStyle(ButtonStyle.Secondary).setCustomId("PingNo"),
                            new ButtonBuilder().setLabel("Only in Tickets").setStyle(ButtonStyle.Secondary).setCustomId("PingTickets"),
                            new ButtonBuilder().setLabel("Only In Ticket if Respons").setStyle(ButtonStyle.Secondary).setCustomId("PingTickets2"),
                            new ButtonBuilder().setLabel("Only when it's urgent").setStyle(ButtonStyle.Secondary).setCustomId("PingUrgent"),
                        ]),
                        new ActionRowBuilder().addComponents([
                            new ButtonBuilder().setLabel("Cancel Verification").setStyle(ButtonStyle.Danger).setCustomId("Cancel_Verify")
                        ]),
                    ]
                }).catch(() => { });
            } else {
                interaction?.update({
                    ephemeral: true,
                    content: ":x: **WRONG KEYWORD**\n> Verification Cancelled, Make sure to Read the RULES AGAIN!\n> Tipp: ||Check my very first message!||",
                    components: [
                        new ActionRowBuilder().addComponents([
                            new ButtonBuilder().setLabel("Key2021deadloom <3").setStyle(ButtonStyle.Danger).setCustomId("Key2021deadloom <3").setDisabled(),
                            new ButtonBuilder().setLabel("Keydeadloom <32022").setStyle(ButtonStyle.Danger).setCustomId("Keydeadloom <32022").setDisabled(),
                            new ButtonBuilder().setLabel("Keydeadloom <32021").setStyle(ButtonStyle.Danger).setCustomId("Keydeadloom <32021").setDisabled(),
                            new ButtonBuilder().setLabel("Key2022deadloom <3").setStyle(ButtonStyle.Success).setCustomId("Key2022deadloom <3").setDisabled(),
                            new ButtonBuilder().setLabel("KeyOfdeadloom <3").setStyle(ButtonStyle.Danger).setCustomId("KeyOfdeadloom <3").setDisabled(),
                        ])
                    ]
                }).catch(() => { });
            }
        }

        if (channel.id == rulesChannel && interaction?.customId == "Cancel_Verify") {
            interaction?.update({
                ephemeral: true,
                content: "👌 **Cancelled the Verification Process!**",
                components: []
            }).catch(() => { });
        }
        // CANCEL 
        if (channel.id == rulesChannel && interaction?.customId == "no-verification") {
            interaction?.reply({
                ephemeral: true,
                content: "👌 **Cancelled the Verification Process!**"
            }).catch(() => { });
        }

        // Simple verify button from verify command
        if (interaction?.customId === "verify_button") {
            const settingsKey = `${interaction.guild.id}-verify`;
            const settings = client.serversettings?.get(settingsKey);
            
            if (!settings?.role) {
                return interaction.reply({
                    ephemeral: true,
                    content: "❌ Verification is not properly configured."
                }).catch(() => {});
            }

            if (interaction.member.roles.cache.has(settings.role)) {
                return interaction.reply({
                    ephemeral: true,
                    content: "✅ You are already verified!"
                }).catch(() => {});
            }

            try {
                await interaction.member.roles.add(settings.role);
                interaction.reply({
                    ephemeral: true,
                    content: "✅ **You have been verified!** Welcome to the server!"
                }).catch(() => {});
            } catch (e) {
                interaction.reply({
                    ephemeral: true,
                    content: "❌ Could not verify you. Please contact a staff member."
                }).catch(() => {});
            }
        }
    })
}