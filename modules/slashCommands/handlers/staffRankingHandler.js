const { EmbedBuilder } = require('discord.js');

class StaffRankingSystem {
    constructor(client) {
        this.client = client;
        this.rankings = new Map();
    }

    async addPoints(userId, points, reason) {
        if (!this.rankings.has(userId)) {
            this.rankings.set(userId, {
                points: 0,
                tickets: 0,
                warnings: 0,
                reviews: [],
                joinedAt: Date.now()
            });
        }

        const data = this.rankings.get(userId);
        data.points += points;
        data.reviews.push({
            points,
            reason,
            date: Date.now()
        });

        return data;
    }

    async getPerformanceMetrics(userId) {
        const data = this.rankings.get(userId);
        if (!data) return null;

        const daysSinceJoined = Math.floor((Date.now() - data.joinedAt) / (1000 * 60 * 60 * 24));
        const avgPointsPerDay = daysSinceJoined > 0 ? (data.points / daysSinceJoined).toFixed(2) : 0;

        return {
            totalPoints: data.points,
            tickets: data.tickets,
            warnings: data.warnings,
            avgPointsPerDay,
            daysSinceJoined,
            rank: this.calculateRank(data.points)
        };
    }

    calculateRank(points) {
        if (points >= 1000) return { name: '⭐ Legendary', color: '#FFD700' };
        if (points >= 500) return { name: '👑 Elite', color: '#9B59B6' };
        if (points >= 200) return { name: '🏆 Expert', color: '#3498DB' };
        if (points >= 100) return { name: '✨ Advanced', color: '#2ECC71' };
        if (points >= 50) return { name: '📈 Intermediate', color: '#F39C12' };
        return { name: '🌱 Trainee', color: '#95A5A6' };
    }

    async getLeaderboard(limit = 10) {
        const sorted = Array.from(this.rankings.entries())
            .sort((a, b) => b[1].points - a[1].points)
            .slice(0, limit);

        return sorted;
    }

    async createLeaderboardEmbed(client) {
        const leaderboard = await this.getLeaderboard(10);
        
        let description = '';
        leaderboard.forEach((entry, index) => {
            const [userId, data] = entry;
            const rank = this.calculateRank(data.points);
            description += `**${index + 1}. ${rank.name}** <@${userId}> - ${data.points} points\n`;
        });

        return new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: 'Staff Performance Leaderboard', iconURL: client.user.displayAvatarURL() })
            .setTitle('🏆 Top Performers')
            .setDescription(description || 'No staff members ranked yet')
            .setFooter({ text: 'Rankings update in real-time', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
    }
}

module.exports = StaffRankingSystem;
