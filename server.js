const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const SCORES_FILE = path.join(__dirname, 'scores.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readScores() {
  try {
    if (!fs.existsSync(SCORES_FILE)) return {};
    const raw = fs.readFileSync(SCORES_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

function writeScores(scores) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf8');
}

app.get('/api/scores', (req, res) => {
  const game = String(req.query.game || 'default').trim() || 'default';
  const allScores = readScores();
  const table = allScores[game] && typeof allScores[game] === 'object' ? allScores[game] : {};
  const rows = Object.entries(table)
    .filter(([nick, best]) => nick && Number.isFinite(Number(best)))
    .map(([nick, best]) => ({ nick, best: Math.floor(Number(best) || 0) }))
    .sort((a, b) => b.best - a.best || a.nick.localeCompare(b.nick, 'tr'))
    .slice(0, 50);
  res.json(rows);
});

app.post('/api/scores', (req, res) => {
  const game = String(req.body.game || 'default').trim() || 'default';
  const nick = String(req.body.nick || '').replace(/\s+/g, ' ').trim().slice(0, 18);
  const best = Math.max(0, Math.floor(Number(req.body.best) || 0));

  if (!nick) {
    return res.status(400).json({ error: 'Nick gerekli.' });
  }

  const allScores = readScores();
  if (!allScores[game] || typeof allScores[game] !== 'object') {
    allScores[game] = {};
  }

  const existing = Math.floor(Number(allScores[game][nick]) || 0);
  if (best > existing) {
    allScores[game][nick] = best;
    writeScores(allScores);
  }

  res.json({ ok: true, best: Math.max(best, existing) });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frozen Tower Rush running on port ${PORT}`);
});
