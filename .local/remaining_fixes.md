# Remaining Fixes Needed for Discord Bot

## COMPLETED:
1. Fixed Enmap import issue in ticket bots (dnd, ticket_1, and template) - changed to `require("enmap").default`
2. Fixed staff ranking system null check for roles in `/modules/commands.js` line 4640
3. Fixed all Setup toggle commands (11 files in /modules/commands/Setup/) - updated to EmbedBuilder and v14 syntax
4. Fixed imports in `/modules/commands.js`:
   - Changed MessageActionRow to ActionRowBuilder
   - Changed MessageSelectMenu to StringSelectMenuBuilder
   - Changed MessageButton to ButtonBuilder
   - Changed MessageEmbed to EmbedBuilder
   - Added ButtonStyle and PermissionFlagsBits

5. Fixed setupticket, setupfeatures, setuporder commands in `/modules/commands.js`:
   - Updated to use new component builders
   - Fixed permission checks to use PermissionFlagsBits.Administrator
   - Updated button styles to ButtonStyle.Primary/Link

## STILL NEEDS TO BE DONE:
The user asked for these commands to be fixed but some don't exist yet:
- setupverify - NOT FOUND in code
- setupsuggest - NOT FOUND in code
- setupnodestats - NOT FOUND in code
- setupfeedback - NOT FOUND in code

These commands may need to be CREATED, not just fixed. Ask user for clarification.

## ALSO NEEDS FIXING:
There are likely more usages of old Discord.js v13 components throughout the large commands.js file (4742 lines) that still use:
- Discord.MessageEmbed (use grep to find: `Discord.MessageEmbed`)
- message.member.permissions.has("ADMINISTRATOR") instead of PermissionFlagsBits
- MessageButton, MessageActionRow, MessageSelectMenu

## TO COMPLETE:
1. Run grep to find remaining old Discord.js usages in commands.js
2. Fix all instances
3. Restart workflow and test
4. Ask user about missing commands (setupverify, setupsuggest, setupnodestats, setupfeedback)
