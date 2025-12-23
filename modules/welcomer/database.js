const Database = require('better-sqlite3');

class DatabaseManager {
    constructor() {
        this.db = new Database('Live.db');
        this.initializeDatabase();
    }

    initializeDatabase() {
        try {
            this.db.pragma('journal_mode = WAL');
      
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS Users (
                    "ID" TEXT UNIQUE PRIMARY KEY,
                    "Username" TEXT,
                    "Invites" NUMERIC DEFAULT 0,
                    "By" TEXT DEFAULT 0,
                    "Server" TEXT DEFAULT 'IN',
                    "Roles" TEXT
                )`).run();

            console.log('Database initialized successfully');
        } catch (err) {
            console.error('Database initialization failed:', err);
            process.exit(1);
        }
    }

    saveUser(ID,Username) {
        const stmt = this.db.prepare(`INSERT OR IGNORE INTO Users (ID,Username) VALUES (?,?)`);
        return stmt.run(ID,Username);
    }
    updateBackupRoles(ID,Roles) {
        const stmt = this.db.prepare(`UPDATE Users SET Roles = ? WHERE ID = ?`);
        return stmt.run(Roles,ID);
    }
    updateInviterUser(ID,By) {
        const stmt = this.db.prepare(`UPDATE Users SET By = ? WHERE ID = ?`);
        return stmt.run(By,ID);
    }
    updateMessages(ID,Number) {
        const stmt = this.db.prepare(`UPDATE Users SET Messages = ? WHERE ID = ?`);
        return stmt.run(Number,ID);
    }
    updateServerState(ID, Server) {
        const stmt = this.db.prepare(`UPDATE Users SET Server = ? WHERE ID = ?`);
        return stmt.run(Server,ID);
    }
    updateinvites(ID, Invites) {
        const stmt = this.db.prepare(`UPDATE Users SET Invites = ? WHERE ID = ?`);
        return stmt.run(Invites,ID);
    }
    getRoles(ID) {
        return this.db.prepare(`SELECT Roles FROM Users WHERE ID = ?`).get(ID);
    }
    getUser(ID) {
        return this.db.prepare(`SELECT * FROM Users WHERE ID = ?`).get(ID);
    }
    getInvites(ID) {
        return this.db.prepare(`SELECT Invites FROM Users WHERE ID = ?`).get(ID);
    }
    getInviter(ID) {
        return this.db.prepare(`SELECT By FROM Users WHERE ID = ?`).get(ID);
    }
}

module.exports = new DatabaseManager();
