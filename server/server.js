const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

let db;

async function connectDB() {
  db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  });
  console.log('MySQL connected.');
}

app.post('/ai', async (req, res) => {
  try {
    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      return res.status(500).json({ ok: false, error: 'GEMINI_API_KEY is not set' });
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ ok: false, error: 'Message is required' });
    }

    const prompt = [
      'You are ANZO AI, a friendly assistant for Anzo portfolio website.',
      'Answer clearly and briefly. Use simple English.',
      'Do not invent private information.',
      'Portfolio facts:',
      '- Name: Anzo',
      '- Role: Database Administrator',
      '- Location: Phnom Penh, Cambodia',
      '- Phone: 096 464 2015',
      '- Email: Maibich2019@gmail.com',
      '- Services: database setup, PostgreSQL/MySQL tuning, query optimization, Redis caching, MongoDB support, Python automation, backup and access review.',
      '- Payment link: https://link.payway.com.kh/ABAPAYzI4445189',
      '',
      'Visitor question:',
      message
    ].join('\n');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 220 }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: data.error?.message || 'Gemini API error' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    res.json({ ok: true, reply: reply || 'Sorry, I could not generate a reply.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'AI server error' });
  }
});

app.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }
    if (!db) {
      return res.status(503).json({ ok: false, error: 'Database is not connected' });
    }

    await db.execute(
      'INSERT INTO contact_messages (name, email, subject, message) VALUES (?,?,?,?)',
      [name, email, subject || null, message]
    );

    res.json({ ok: true, message: 'Message saved!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'Anzo backend running' });
});

const PORT = process.env.PORT || 3000;

connectDB().catch(err => {
  console.warn('MySQL not connected. AI endpoint can still run.');
  console.warn(err.message);
}).finally(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
