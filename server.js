const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.API_SECRET || 'X7kL9mN2pQ9rT8vW3zA1bC4';

app.use(cors());
app.use(express.json());

// ========== ХРАНИЛИЩА ==========
let leaderboard = [];
let evolution = {
    total_wins: 0,
    target_wins: 10000,
    current_generation: 1,
    is_evolving: false,
    evolution_end: null
};

// ========== СТРАТЕГИЯ ИИ ==========
let currentStrategy = { rock: 0.34, scissors: 0.33, paper: 0.33 };
if (fs.existsSync('strategy.json')) {
    currentStrategy = JSON.parse(fs.readFileSync('strategy.json'));
}

function saveStrategy() {
    fs.writeFileSync('strategy.json', JSON.stringify(currentStrategy));
}

// ========== ПРОФИЛИ ==========
let profiles = {};
if (fs.existsSync('profiles.json')) {
    profiles = JSON.parse(fs.readFileSync('profiles.json'));
}

function saveProfiles() {
    fs.writeFileSync('profiles.json', JSON.stringify(profiles, null, 2));
}

function getRank(totalWins) {
    if (totalWins >= 500) return { name: 'Алмаз', emoji: '💎', color: '#00FFFF' };
    if (totalWins >= 100) return { name: 'Платина', emoji: '🏆', color: '#E5E4E2' };
    if (totalWins >= 50) return { name: 'Золото', emoji: '⭐', color: '#FFD700' };
    if (totalWins >= 10) return { name: 'Серебро', emoji: '🥈', color: '#C0C0C0' };
    return { name: 'Бронза', emoji: '🥉', color: '#CD7F32' };
}

// ========== ДОСКА СТРИМЕРОВ ==========
let creators = [];
if (fs.existsSync('creators.json')) {
    creators = JSON.parse(fs.readFileSync('creators.json'));
}

function saveCreators() {
    fs.writeFileSync('creators.json', JSON.stringify(creators, null, 2));
}

// ========== ДРУЗЬЯ ==========
let friendships = {};
if (fs.existsSync('friendships.json')) {
    friendships = JSON.parse(fs.readFileSync('friendships.json'));
}

function saveFriendships() {
    fs.writeFileSync('friendships.json', JSON.stringify(friendships, null, 2));
}

// ========== ДОСТИЖЕНИЯ ==========
function checkAchievements(name, wins, streak) {
    const profile = profiles[name];
    if (!profile) return;
    
    const newAchievements = [];
    const achievementsMap = {
        'first_win': 'Первая победа 🎉',
        'streak_5': '5 побед подряд 🔥',
        'streak_10': '10 побед подряд 💪',
        '100_wins': '100 побед 👑',
        '500_wins': '500 побед 🏆'
    };
    
    if (wins >= 1 && !profile.achievements.includes('first_win')) {
        profile.achievements.push('first_win');
        newAchievements.push('first_win');
    }
    if (streak >= 5 && !profile.achievements.includes('streak_5')) {
        profile.achievements.push('streak_5');
        newAchievements.push('streak_5');
    }
    if (streak >= 10 && !profile.achievements.includes('streak_10')) {
        profile.achievements.push('streak_10');
        newAchievements.push('streak_10');
    }
    if (wins >= 100 && !profile.achievements.includes('100_wins')) {
        profile.achievements.push('100_wins');
        newAchievements.push('100_wins');
    }
    if (wins >= 500 && !profile.achievements.includes('500_wins')) {
        profile.achievements.push('500_wins');
        newAchievements.push('500_wins');
    }
    
    if (newAchievements.length) {
        console.log(`🏅 Новые достижения у ${name}: ${newAchievements.map(a => achievementsMap[a]).join(', ')}`);
        saveProfiles();
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function checkAuth(req) {
    return req.headers['x-api-key'] === SECRET_KEY;
}

function startEvolution() {
    evolution.is_evolving = true;
    evolution.evolution_end = new Date(Date.now() + 4 * 60 * 60 * 1000);
    console.log('🧬 Эволюция запущена до', evolution.evolution_end);
    setTimeout(() => finishEvolution(), 4 * 60 * 60 * 1000);
}

function finishEvolution() {
    evolution.current_generation++;
    evolution.target_wins += 1000;
    evolution.total_wins = 0;
    evolution.is_evolving = false;
    evolution.evolution_end = null;

    currentStrategy.rock = Math.min(0.6, currentStrategy.rock + 0.02);
    currentStrategy.scissors = Math.max(0.2, currentStrategy.scissors - 0.01);
    currentStrategy.paper = Math.max(0.2, currentStrategy.paper - 0.01);
    saveStrategy();

    console.log(`✅ Эволюция завершена. Новое поколение #${evolution.current_generation}`);
}

// ========== API ЭНДПОИНТЫ ==========

// Рекорды
app.get('/api/leaderboard', (req, res) => {
    const sorted = [...leaderboard].sort((a, b) => b.streak - a.streak);
    res.json(sorted);
});

app.post('/api/record-record', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    const { name, streak } = req.body;
    if (!name || !streak) return res.status(400).json({ error: 'Invalid data' });
    leaderboard.push({ name, streak });
    console.log(`📊 Новый рекорд: ${name} — ${streak}`);
    res.json({ status: 'ok' });
});

app.post('/api/record-win', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    if (evolution.is_evolving) return res.status(423).json({ error: 'Evolving, try later' });
    
    const { player_name, streak } = req.body;
    if (!player_name) return res.status(400).json({ error: 'Invalid player name' });
    
    if (!profiles[player_name]) {
        profiles[player_name] = {
            name: player_name,
            avatar: '👤',
            totalWins: 0,
            totalGames: 0,
            bestStreak: 0,
            achievements: [],
            rank: getRank(0),
            registeredAt: new Date().toISOString()
        };
    }
    
    profiles[player_name].totalWins++;
    if (streak && streak > profiles[player_name].bestStreak) {
        profiles[player_name].bestStreak = streak;
    }
    profiles[player_name].rank = getRank(profiles[player_name].totalWins);
    checkAchievements(player_name, profiles[player_name].totalWins, streak || 0);
    saveProfiles();
    
    evolution.total_wins++;
    console.log(`🏆 Победа! Всего: ${evolution.total_wins}/${evolution.target_wins}`);
    
    if (evolution.total_wins >= evolution.target_wins) {
        startEvolution();
    }
    
    res.json({ status: 'ok', total_wins: evolution.total_wins, target_wins: evolution.target_wins });
});

app.get('/api/evolution', (req, res) => {
    res.json(evolution);
});

app.get('/api/strategy', (req, res) => {
    res.json(currentStrategy);
});

// Профили
app.get('/api/profile/:name', (req, res) => {
    const name = req.params.name;
    const profile = profiles[name];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
});

app.post('/api/profile', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    const { name, avatar } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    
    if (!profiles[name]) {
        profiles[name] = {
            name,
            avatar: avatar || '👤',
            totalWins: 0,
            totalGames: 0,
            bestStreak: 0,
            achievements: [],
            rank: getRank(0),
            registeredAt: new Date().toISOString()
        };
    } else if (avatar) {
        profiles[name].avatar = avatar;
    }
    saveProfiles();
    res.json(profiles[name]);
});

// Доска стримеров
app.get('/api/creators', (req, res) => {
    res.json(creators);
});

app.post('/api/admin/add-creator', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    const { name, platform, link, streak } = req.body;
    if (!name || !platform || !link) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    creators.push({
        id: Date.now(),
        name,
        platform,
        link,
        streak: streak || 0,
        date: new Date().toISOString()
    });
    saveCreators();
    res.json({ status: 'ok' });
});

app.post('/api/admin/delete-creator', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    const { id } = req.body;
    creators = creators.filter(c => c.id !== id);
    saveCreators();
    res.json({ status: 'ok' });
});

app.post('/api/admin/update-creator-streak', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    const { id, streak } = req.body;
    const creator = creators.find(c => c.id === id);
    if (creator) {
        creator.streak = streak;
        saveCreators();
    }
    res.json({ status: 'ok' });
});

// Друзья
app.post('/api/friends/request', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    const { from, to } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'Missing fields' });
    if (from === to) return res.status(400).json({ error: 'Cannot add yourself' });
    
    if (!friendships[from]) friendships[from] = { friends: [], pending: [] };
    if (!friendships[to]) friendships[to] = { friends: [], pending: [] };
    
    if (friendships[from].friends.includes(to) || friendships[to].friends.includes(from)) {
        return res.status(400).json({ error: 'Already friends' });
    }
    if (friendships[to].pending.includes(from)) {
        return res.status(400).json({ error: 'Request already sent' });
    }
    
    friendships[to].pending.push(from);
    saveFriendships();
    res.json({ status: 'ok' });
});

app.post('/api/friends/accept', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    const { user, requester } = req.body;
    if (!user || !requester) return res.status(400).json({ error: 'Missing fields' });
    
    if (!friendships[user]) friendships[user] = { friends: [], pending: [] };
    if (!friendships[requester]) friendships[requester] = { friends: [], pending: [] };
    
    friendships[user].pending = friendships[user].pending.filter(u => u !== requester);
    friendships[user].friends.push(requester);
    friendships[requester].friends.push(user);
    saveFriendships();
    res.json({ status: 'ok' });
});

app.post('/api/friends/reject', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    const { user, requester } = req.body;
    if (!friendships[user]) friendships[user] = { friends: [], pending: [] };
    friendships[user].pending = friendships[user].pending.filter(u => u !== requester);
    saveFriendships();
    res.json({ status: 'ok' });
});

app.post('/api/friends/remove', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    const { user, friend } = req.body;
    if (!friendships[user]) friendships[user] = { friends: [], pending: [] };
    if (!friendships[friend]) friendships[friend] = { friends: [], pending: [] };
    
    friendships[user].friends = friendships[user].friends.filter(f => f !== friend);
    friendships[friend].friends = friendships[friend].friends.filter(f => f !== user);
    saveFriendships();
    res.json({ status: 'ok' });
});

app.get('/api/friends/:name', (req, res) => {
    const name = req.params.name;
    const data = friendships[name] || { friends: [], pending: [] };
    res.json(data);
});

// Админ-команды
app.post('/api/admin/clear-leaderboard', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    leaderboard = [];
    res.json({ status: 'ok' });
});

app.post('/api/admin/reset-evolution', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    evolution = {
        total_wins: 0,
        target_wins: 10000,
        current_generation: 1,
        is_evolving: false,
        evolution_end: null
    };
    res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'alive', time: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🔐 API_SECRET: ${SECRET_KEY === 'X7kL9mN2pQ9rT8vW3zA1bC4' ? '✅ задан' : '⚠️ стандартный'}`);
});
