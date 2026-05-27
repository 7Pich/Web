const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

let db;
const telegramCountPath = path.join(__dirname, '.telegram-count');

function nextTelegramMessageNumber() {
  const fallback = Number.parseInt(process.env.TELEGRAM_MESSAGE_START || '68', 10);
  let current = Number.isFinite(fallback) ? fallback : 68;

  try {
    if (fs.existsSync(telegramCountPath)) {
      const saved = Number.parseInt(fs.readFileSync(telegramCountPath, 'utf8'), 10);
      if (Number.isFinite(saved)) current = saved + 1;
    }
    fs.writeFileSync(telegramCountPath, String(current));
  } catch (err) {
    console.warn('Could not update Telegram message counter:', err.message);
  }

  return current;
}

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
    const { message, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      return res.status(500).json({ ok: false, error: 'GEMINI_API_KEY is not set' });
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ ok: false, error: 'Message is required' });
    }

    const recentHistory = Array.isArray(history) ? history.slice(-8).map(item => {
      const role = item && item.role === 'assistant' ? 'Assistant' : 'Visitor';
      const text = String((item && item.text) || '').replace(/\s+/g, ' ').trim().slice(0, 240);
      return text ? `${role}: ${text}` : '';
    }).filter(Boolean) : [];

    const prompt = [
      'You are ANZO AI, a friendly assistant for Anzo portfolio website.',
      'Answer clearly and briefly. Use simple English.',
      'Behave like a chat and portfolio search assistant: understand follow-up questions, find the best matching Anzo facts, compare skills/projects when asked, and suggest the most relevant section link.',
      'Do not invent private information.',
      'If the visitor asks for information outside the portfolio, answer generally only when it helps explain Anzo services; otherwise say you can best answer about Anzo, databases, projects, services, contact, CV, and payment.',
      'Portfolio facts:',
      '- Name: Anzo',
      '- Role: Database Administrator',
      '- Location: Phnom Penh, Cambodia',
      '- Education: Year 4 student focused on web, database, and software development.',
      '- Languages: Khmer and English.',
      '- Phone: 096 464 2015',
      '- Email: Maibich2019@gmail.com',
      '- Profile: Anzo is passionate about data architecture, performance tuning, reliable systems, clean database operations, and practical backend/data workflows.',
      '- Core skills: PostgreSQL, MySQL/MariaDB, MongoDB, Redis, SQL, Python, database design, indexing, query tuning, backup planning, recovery, access control, data migration, ETL, validation, reporting, and caching.',
      '- Services: database setup, schema design, PostgreSQL/MySQL tuning, slow query review, execution plan checks, Redis caching, MongoDB maintenance, Python automation, API/data cleanup, backups, recovery planning, and access review.',
      '- Experience: Database Administrator / Data Support from 2023 to present; manages databases, improves SQL performance, creates backup plans, and supports data reports.',
      '- Experience: Junior Database / Backend Support and project/freelance work from 2021 to 2023; supported data migration, cleanup, API data tasks, schema updates, user permissions, and troubleshooting.',
      '- Project: Fintech Reconciliation Platform using PostgreSQL, Python, and Redis; reliable checks for payment records, settlement review, and daily reporting.',
      '- Project: Inventory Sync Engine using MySQL and Python; improved inventory synchronization, retry handling, and error visibility.',
      '- Project: Customer Analytics Store using MongoDB; flexible schema design, aggregation, and dashboard analytics.',
      '- Project: API Cache Layer using Redis; faster API responses, lower database load, and TTL rules.',
      '- Project: Data Migration Toolkit using Python and SQL; validates counts, missing values, duplicates, and supports safer imports.',
      '- Project: Backup and Access Audit; reviewed backup routines, database users, permissions, and recovery plans.',
      '- Availability: open for database support, query optimization, backend data tasks, freelance projects, and full-time opportunities.',
      '- Payment link: https://link.payway.com.kh/ABAPAYzI4445189',
      '- Keep answers helpful, specific to Anzo, and direct visitors to the contact form when they want to hire or discuss a project.',
      '',
      'Recent chat:',
      recentHistory.length ? recentHistory.join('\n') : 'No previous chat.',
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

app.post('/telegram', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({ ok: false, error: 'Telegram is not configured' });
    }
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email' });
    }
    if (String(message).trim().length < 10) {
      return res.status(400).json({ ok: false, error: 'Message is too short' });
    }

    const messageNumber = nextTelegramMessageNumber();
    const text = [
      `\uD83D\uDCEC New Portfolio Message #${messageNumber}`,
      '',
      `\uD83D\uDC64 Name: ${String(name).trim()}`,
      `\uD83D\uDCE7 Email: ${String(email).trim()}`,
      `\uD83D\uDCCC Subject: ${subject || 'Not selected'}`,
      '\uD83D\uDCAC Message:',
      String(message).trim()
    ].join('\n');

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      return res.status(response.status || 502).json({
        ok: false,
        error: data.description || 'Telegram send failed'
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Telegram server error' });
  }
});

app.post('/payment', async (req, res) => {
  try {
    const { name, contact, amount, currency, transactionId, note } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({ ok: false, error: 'Telegram is not configured' });
    }
    if (!name || !contact || !amount || !transactionId) {
      return res.status(400).json({ ok: false, error: 'Missing payment fields' });
    }

    const paidAmount = Number.parseFloat(amount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid amount' });
    }

    const text = [
      '\uD83D\uDCB3 New Payment Transaction',
      '',
      `\uD83D\uDC64 Name: ${String(name).trim()}`,
      `\u260E\uFE0F Contact: ${String(contact).trim()}`,
      `\uD83D\uDCB5 Amount: ${paidAmount.toFixed(2)} ${currency || 'USD'}`,
      `\uD83E\uDDFE Transaction ID: ${String(transactionId).trim()}`,
      `\uD83D\uDCDD Note: ${note ? String(note).trim() : 'No note'}`,
      `\u23F1 Sent: ${new Date().toISOString()}`
    ].join('\n');

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      return res.status(response.status || 502).json({
        ok: false,
        error: data.description || 'Telegram send failed'
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Payment notification server error' });
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
