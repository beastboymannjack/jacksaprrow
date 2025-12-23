module.exports = {
    // --- Bot Credentials (will be loaded from mainconfig) ---
    // clientTOKEN: "YOUR_DISCORD_BOT_TOKEN",
    // clientID: "YOUR_BOTS_CLIENT_ID",

    // --- Server & Channel IDs (CONFIGURE THESE) ---
    serverID: process.env.WELCOMER_SERVER_ID || "", // Guild/Server ID
    welcomeChannel: process.env.WELCOMER_WELCOME_CHANNEL || "", // Channel for welcome messages
    leftChannel: process.env.WELCOMER_LEFT_CHANNEL || "", // Channel for leave messages
    infoChannel: process.env.WELCOMER_INFO_CHANNEL || "", // Voice channel for member count

    // --- Role IDs ---
    memberRole: process.env.WELCOMER_MEMBER_ROLE || "", // Default role for new members

    // --- Bot Info ---
    name: "Welcomer System",
    devs: [] // Will be populated from mainconfig
};
