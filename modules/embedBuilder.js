const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const EMBEDS_FILE = path.join(process.cwd(), 'embeds.json');

let embedConfigs = {};

function loadEmbedConfigs() {
    try {
        if (fs.existsSync(EMBEDS_FILE)) {
            embedConfigs = JSON.parse(fs.readFileSync(EMBEDS_FILE, 'utf8'));
            console.log('[EmbedBuilder] Loaded embed configurations');
            return true;
        }
    } catch (err) {
        console.error('[EmbedBuilder] Error loading embed configs:', err.message);
    }
    return false;
}

/**
 * Create embed from configuration
 * @param {string} embedKey - Key in embeds.json
 * @param {Object} replacements - Placeholder replacements {key: value}
 * @returns {EmbedBuilder|null}
 */
function createEmbed(embedKey, replacements = {}) {
    try {
        const config = embedConfigs[embedKey];
        if (!config) {
            console.warn(`[EmbedBuilder] Embed config not found: ${embedKey}`);
            return null;
        }

        const embed = new EmbedBuilder();

        // Set color
        if (config.color) {
            embed.setColor(config.color);
        }

        // Set title
        if (config.title) {
            embed.setTitle(replacePlaceholders(config.title, replacements));
        } else if (config.titleFormat) {
            embed.setTitle(replacePlaceholders(config.titleFormat, replacements));
        }

        // Set description
        if (config.description) {
            embed.setDescription(replacePlaceholders(config.description, replacements));
        } else if (config.descriptionKey) {
            const desc = replacements[config.descriptionKey] || '';
            embed.setDescription(replacePlaceholders(desc, replacements));
        }

        // Add fields
        if (config.fields && Array.isArray(config.fields)) {
            config.fields.forEach(field => {
                // Check condition if present
                if (field.condition) {
                    if (!evaluateCondition(field.condition, replacements)) {
                        return; // Skip this field
                    }
                }

                const name = replacePlaceholders(field.name, replacements);
                const value = replacePlaceholders(field.value, replacements);

                embed.addFields({
                    name,
                    value: value || '(empty)',
                    inline: field.inline !== false
                });
            });
        }

        // Set footer
        if (config.footer) {
            embed.setFooter({
                text: replacePlaceholders(config.footer.text, replacements),
                iconURL: config.footer.iconURL
            });
        }

        // Set timestamp
        if (config.timestamp === true) {
            embed.setTimestamp();
        }

        return embed;
    } catch (err) {
        console.error(`[EmbedBuilder] Error creating embed '${embedKey}':`, err.message);
        return null;
    }
}

/**
 * Replace placeholders in string
 * @param {string} text - Text with {placeholder} syntax
 * @param {Object} replacements - Replacement values
 * @returns {string}
 */
function replacePlaceholders(text, replacements = {}) {
    if (!text) return '';
    
    return text.replace(/{(\w+)}/g, (match, key) => {
        return replacements[key] !== undefined ? replacements[key] : match;
    });
}

/**
 * Evaluate condition string
 * @param {string} condition - Condition like "!secondaryHealthy" or "flag"
 * @param {Object} context - Context object
 * @returns {boolean}
 */
function evaluateCondition(condition, context) {
    if (condition.startsWith('!')) {
        const key = condition.slice(1);
        return !context[key];
    }
    return !!context[condition];
}

/**
 * Get raw embed config for manual modification
 * @param {string} embedKey - Key in embeds.json
 * @returns {Object|null}
 */
function getEmbedConfig(embedKey) {
    return embedConfigs[embedKey] || null;
}

/**
 * Create multiple embeds at once
 * @param {string[]} embedKeys - Array of embed config keys
 * @param {Object} replacements - Shared placeholder replacements
 * @returns {EmbedBuilder[]}
 */
function createEmbeds(embedKeys, replacements = {}) {
    return embedKeys
        .map(key => createEmbed(key, replacements))
        .filter(embed => embed !== null);
}

/**
 * Reload embed configs from file
 * @returns {boolean}
 */
function reloadEmbedConfigs() {
    return loadEmbedConfigs();
}

// Load configs on module initialization
loadEmbedConfigs();

module.exports = {
    createEmbed,
    createEmbeds,
    getEmbedConfig,
    replacePlaceholders,
    evaluateCondition,
    reloadEmbedConfigs
};
