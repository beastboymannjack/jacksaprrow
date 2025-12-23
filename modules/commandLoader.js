const fs = require('fs');
const path = require('path');

const categoryEmojis = {
    'Information': '📌',
    'Admin': '⚙️',
    'AI': '🧠',
    'Fun': '🎮',
    'Hosting': '🤖',
    'Moderation': '🔨',
    'Security': '🔒',
    'Setup': '⚙️',
    'Staff': '👥',
    'Tickets': '🎫'
};

const categoryColors = {
    'Information': '#00D9FF',
    'Admin': '#FFA500',
    'AI': '#5865F2',
    'Fun': '#FF6B9D',
    'Hosting': '#FFD700',
    'Moderation': '#ED4245',
    'Security': '#8B0000',
    'Setup': '#808080',
    'Staff': '#57F287',
    'Tickets': '#FF4757'
};

function loadAllCommands() {
    const commands = {};
    const categories = {};
    const commandsPath = path.join(process.cwd(), 'modules', 'commands');

    const categoryDirs = fs.readdirSync(commandsPath);

    categoryDirs.forEach(categoryDir => {
        const categoryPath = path.join(commandsPath, categoryDir);
        const stat = fs.statSync(categoryPath);

        if (!stat.isDirectory()) return;

        if (!categories[categoryDir]) {
            categories[categoryDir] = {
                id: categoryDir.toLowerCase(),
                emoji: categoryEmojis[categoryDir] || '📦',
                name: categoryDir,
                color: categoryColors[categoryDir] || '#5865F2',
                commands: []
            };
        }

        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
        files.forEach(file => {
            try {
                const command = require(path.join(categoryPath, file));
                if (command.name) {
                    commands[command.name] = {
                        name: command.name,
                        category: categoryDir,
                        description: command.description || 'No description available',
                        aliases: command.aliases || [],
                        subcategory: command.subcategory || categoryDir
                    };
                    categories[categoryDir].commands.push(command.name);
                }
            } catch (err) {
                // Skip files that can't be loaded
            }
        });
    });

    return { commands, categories };
}

function getCommandsByCategory(category, allCommands) {
    return Object.values(allCommands.commands)
        .filter(cmd => cmd.category === category)
        .map(cmd => cmd.name);
}

module.exports = {
    loadAllCommands,
    getCommandsByCategory,
    categoryEmojis,
    categoryColors
};
