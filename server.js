const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.API_SECRET || 'rps_super_secret_2026';

app.use(cors());
app.use(express.json());

// Хранилище рекордов
let leaderboard = [];

// Хранилище эволюции
let evolution = {
    total_wins: 0,
    target_wins: 10000,
    current_generation: 1,
    is_evolving: false,
    evolution_end: null
};

// Загрузка стратегии
let currentStrategy = { rock: 0.34, scissors: 0.33, paper: 0.33 };
if (fs.existsSync('strategy.json')) {
    currentStrategy = JSON.parse(fs.readFileSync('strategy.json'));
}

function saveStrategy() {
    fs.writeFileSync('strategy.json', JSON.stringify(currentStrategy));
}

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

    // Новая стратегия: ИИ становится умнее
    currentStrategy.rock = Math.min(0.6, currentStrategy.rock + 0.02);
    currentStrategy.scissors = Math.max(0.2, currentStrategy.scissors - 0.01);
    currentStrategy.paper = Math.max(0.2, currentStrategy.paper - 0.01);
    saveStrategy();

    console.log(`✅ Эволюция завершена. Новое поколение #${evolution.current_generation}, стратегия:`, currentStrategy);
}

// ========== API ЭНДПОИНТЫ ==========

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
    
    const { player_name } = req.body;
    if (!player_name) return res.status(400).json({ error: 'Invalid player name' });
    
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

app.get('/health', (req, res) => {
    res.json({ status: 'alive', time: new Date().toISOString() });
});

// ========== АДМИН-КОМАНДЫ ==========

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

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🔐 API_SECRET: ${SECRET_KEY === 'rps_super_secret_2026' ? '⚠️ используй стандартный (небезопасно)' : '✅ задан'}`);
});
