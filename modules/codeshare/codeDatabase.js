const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'dbs', 'codeshare', 'codes.json');
const STORAGE_PATH = path.join(process.cwd(), 'dbs', 'codeshare', 'files');

if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ codes: [], analytics: { totalDownloads: 0 } }, null, 2));
}

function loadDatabase() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { codes: [], analytics: { totalDownloads: 0 } };
    }
}

function saveDatabase(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function createCode(codeData) {
    const db = loadDatabase();
    const newCode = {
        id: generateId(),
        name: codeData.name,
        description: codeData.description || '',
        language: codeData.language || 'javascript',
        category: codeData.category || 'general',
        codeContent: codeData.codeContent || '',
        files: codeData.files || [],
        videoLink: codeData.videoLink || '',
        version: codeData.version || '1.0',
        downloads: 0,
        stars: 0,
        createdBy: codeData.createdBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPublic: true,
        tags: codeData.tags || []
    };
    
    db.codes.push(newCode);
    saveDatabase(db);
    return newCode;
}

function getAllCodes() {
    const db = loadDatabase();
    return db.codes.sort((a, b) => b.createdAt - a.createdAt);
}

function getCodeById(id) {
    const db = loadDatabase();
    return db.codes.find(c => c.id === id);
}

function getCodeByName(name) {
    const db = loadDatabase();
    return db.codes.find(c => c.name.toLowerCase() === name.toLowerCase());
}

function updateCode(id, updateData) {
    const db = loadDatabase();
    const index = db.codes.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    db.codes[index] = {
        ...db.codes[index],
        ...updateData,
        updatedAt: Date.now()
    };
    saveDatabase(db);
    return db.codes[index];
}

function deleteCode(id) {
    const db = loadDatabase();
    const index = db.codes.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    const codePath = path.join(STORAGE_PATH, id);
    if (fs.existsSync(codePath)) {
        fs.rmSync(codePath, { recursive: true, force: true });
    }
    
    db.codes.splice(index, 1);
    saveDatabase(db);
    return true;
}

function incrementDownloads(id) {
    const db = loadDatabase();
    const code = db.codes.find(c => c.id === id);
    if (code) {
        code.downloads = (code.downloads || 0) + 1;
        db.analytics.totalDownloads = (db.analytics.totalDownloads || 0) + 1;
        saveDatabase(db);
    }
    return code;
}

function incrementStars(id) {
    const db = loadDatabase();
    const code = db.codes.find(c => c.id === id);
    if (code) {
        code.stars = (code.stars || 0) + 1;
        saveDatabase(db);
    }
    return code;
}

function getCodesByCategory(category) {
    const db = loadDatabase();
    return db.codes.filter(c => c.category === category);
}

function getCodesByLanguage(language) {
    const db = loadDatabase();
    return db.codes.filter(c => c.language.toLowerCase() === language.toLowerCase());
}

function searchCodes(query) {
    const db = loadDatabase();
    const lowerQuery = query.toLowerCase();
    return db.codes.filter(c => 
        c.name.toLowerCase().includes(lowerQuery) ||
        c.description.toLowerCase().includes(lowerQuery) ||
        c.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
}

function getAnalytics() {
    const db = loadDatabase();
    return {
        totalCodes: db.codes.length,
        totalDownloads: db.analytics.totalDownloads || 0,
        totalStars: db.codes.reduce((acc, c) => acc + (c.stars || 0), 0),
        topCodes: db.codes.sort((a, b) => b.downloads - a.downloads).slice(0, 5),
        recentCodes: db.codes.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
    };
}

function saveCodeFile(codeId, fileName, content) {
    const codePath = path.join(STORAGE_PATH, codeId);
    if (!fs.existsSync(codePath)) {
        fs.mkdirSync(codePath, { recursive: true });
    }
    
    const filePath = path.join(codePath, fileName);
    fs.writeFileSync(filePath, content);
    return filePath;
}

function getCodeFilePath(codeId, fileName) {
    return path.join(STORAGE_PATH, codeId, fileName);
}

function getCodeFiles(codeId) {
    const codePath = path.join(STORAGE_PATH, codeId);
    if (!fs.existsSync(codePath)) return [];
    return fs.readdirSync(codePath);
}

module.exports = {
    createCode,
    getAllCodes,
    getCodeById,
    getCodeByName,
    updateCode,
    deleteCode,
    incrementDownloads,
    incrementStars,
    getCodesByCategory,
    getCodesByLanguage,
    searchCodes,
    getAnalytics,
    saveCodeFile,
    getCodeFilePath,
    getCodeFiles,
    STORAGE_PATH,
    DB_PATH
};
