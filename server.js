const express = require('express');
const cors = require('cors');
const app = express();

// ========== НАСТРОЙКИ ==========
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.API_SECRET || 'rps_super_secret_2026';

// ========== МИДЛВЕЙРЫ ==========
app.use(cors());                    // разрешает запросы с любых доменов (netlify.app и др.)
app.use(express.json());            // парсинг JSON

// ========== ХРАНИЛИЩА (в памяти) ==========
let leaderboard = [];               // таблица рекордов
let evolution = {
    total_wins: 0,
    target_wins: 10000,
    current_generation: 1,
    is_evolving: false,
    evolution_end: null
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function checkAuth(req) {
    return req.headers['x-api-key'] === SECRET_KEY;
}

function startEvolution() {
    evolution.is_evolving = true;
    evolution.evolution_end = new Date(Date.now() + 4 * 60 * 60 * 1000);
    console.log('🧬 Эволюция запущена до', evolution.evolution_end);
    
    setTimeout(() => {
        evolution.current_generation++;
        evolution.target_wins += 1000;
        evolution.total_wins = 0;
        evolution.is_evolving = false;
        evolution.evolution_end = null;
        console.log('✅ Эволюция завершена. Поколение', evolution.current_generation);
    }, 4 * 60 * 60 * 1000);
}

// ========== API ЭНДПОИНТЫ ==========

// 1. Получить таблицу рекордов (публичный)
app.get('/api/leaderboard', (req, res) => {
    const sorted = [...leaderboard].sort((a, b) => b.streak - a.streak);
    res.json(sorted);
});

// 2. Добавить рекорд (требует ключ)
app.post('/api/record-record', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    
    const { name, streak } = req.body;
    if (!name || !streak) return res.status(400).json({ error: 'Invalid data' });
    
    leaderboard.push({ name, streak });
    console.log(`📊 Новый рекорд: ${name} — ${streak}`);
    res.json({ status: 'ok' });
});

// 3. Записать победу (требует ключ)
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

// 4. Получить статус эволюции (публичный)
app.get('/api/evolution', (req, res) => {
    res.json(evolution);
});

// 5. Проверка здоровья (для UptimeRobot)
app.get('/health', (req, res) => {
    res.json({ status: 'alive', time: new Date().toISOString() });
});

// ========== КОМАНДЫ (для разработчика) ==========
// Доступны только при правильном ключе

// Очистить таблицу рекордов
app.post('/api/admin/clear-leaderboard', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    leaderboard = [];
    console.log('🗑️ Таблица рекордов очищена');
    res.json({ status: 'ok' });
});

// Сбросить эволюцию
app.post('/api/admin/reset-evolution', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    evolution = {
        total_wins: 0,
        target_wins: 10000,
        current_generation: 1,
        is_evolving: false,
        evolution_end: null
    };
    console.log('🔄 Эволюция сброшена');
    res.json({ status: 'ok' });
});

// Добавить тестовый рекорд
app.post('/api/admin/add-test-record', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    const { name, streak } = req.body;
    leaderboard.push({ name: name || 'TEST', streak: streak || 100 });
    res.json({ status: 'ok' });
});

// Показать статистику (для отладки)
app.get('/api/admin/stats', (req, res) => {
    if (!checkAuth(req)) return res.status(401).json({ error: 'unauthorized' });
    res.json({
        leaderboard_count: leaderboard.length,
        evolution,
        server_time: new Date().toISOString()
    });
});

// ========== ЗАПУСК ==========
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🔐 API_SECRET: ${SECRET_KEY === 'rps_super_secret_2026' ? '⚠️ используй стандартный (небезопасно)' : '✅ задан'}`);
});
