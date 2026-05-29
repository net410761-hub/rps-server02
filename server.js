const express = require('express');
const app = express();
app.use(express.json());

const SECRET_KEY = process.env.API_SECRET || 'rps_super_secret_2026';

// Хранилище рекордов (в памяти)
let leaderboard = [
    { name: "GODLIKE", streak: 47 },
    { name: "Terminator", streak: 42 }
];

// Получить таблицу рекордов (без ключа)
app.get('/api/leaderboard', (req, res) => {
    const sorted = [...leaderboard].sort((a, b) => b.streak - a.streak);
    res.json(sorted);
});

// Добавить рекорд (с ключом)
app.post('/api/record-record', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== SECRET_KEY) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    const { name, streak } = req.body;
    if (!name || !streak) {
        return res.status(400).json({ error: 'Invalid data' });
    }
    leaderboard.push({ name, streak });
    console.log(`✅ Новый рекорд: ${name} — ${streak}`);
    res.json({ status: 'ok' });
});

// Проверка здоровья (для UptimeRobot)
app.get('/health', (req, res) => {
    res.json({ status: 'alive' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Сервер запущен на порту ${port}`));
