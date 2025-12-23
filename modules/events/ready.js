var CronJob = require('cron').CronJob;
const { ActivityType, Events } = require('discord.js');
const { startKeepAlive } = require('./../others/keepAlive');
const mainconfig = require("./../../mainconfig.js");

 module.exports = async (client) => {


    client.on(Events.ClientReady, () => {
        startKeepAlive();
        let counter = 0;
        var job = new CronJob('0 * * * * *', function () {
            switch(counter){
                case 0: {
                    try{client.user.setActivity(`${mainconfig.BotSettings.StatusOne}`, { type: ActivityType.Playing })}catch(e){console.error("[Status]", e)}
                    counter++;
                }break;
                case 1: {
                    try{client.user.setActivity(`${mainconfig.BotSettings.StatusTwo}`, { type: ActivityType.Playing })}catch(e){console.error("[Status]", e)}
                    counter++;
                }break;
                case 2: {
                    try{client.user.setActivity(`${mainconfig.BotSettings.StatusThree}`, { type: ActivityType.Playing })}catch(e){console.error("[Status]", e)}
                    counter++;
                }break;
                case 3: {
                    try{client.user.setActivity(`${mainconfig.BotSettings.StatusFour}`, { type: ActivityType.Playing })}catch(e){console.error("[Status]", e)}
                    counter++;
                }break;
                case 4: {
                    try{client.user.setActivity(`Over ${client.guilds.cache.reduce((a, b) => a + b?.memberCount, 0)} Members!`, { type: ActivityType.Playing })}catch(e){console.error("[Status]", e)}
                    counter++;
                }break;
                case 5: {
                    try{client.user.setActivity(`${mainconfig.BotSettings.StatusFive}`, { type: ActivityType.Playing })}catch(e){console.error("[Status]", e)}
                    counter++;
                }break;
                case 6: {
                    try{client.user.setActivity(`${mainconfig.BotSettings.StatusSix}`, { type: ActivityType.Playing })}catch(e){console.error("[Status]", e)}
                    counter=0;
                }break;
                default: {
                    try{client.user.setActivity(`${mainconfig.BotSettings.StatusSeven}`, { type: ActivityType.Playing })}catch(e){console.error("[Status]", e)}
                    counter = 0;
                    counter++;
                }break;
            }
        }, null, true, 'Europe/Berlin');
        job.start();
    })
}