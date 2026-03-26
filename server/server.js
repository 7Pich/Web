const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let db;

async function connectDB() {
  db = await mysql.createConnection({
    host:     process.env.MYSQL_HOST,
    port:     process.env.MYSQL_PORT     || 3306,
    database: process.env.MYSQL_DATABASE,
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  });
  console.log('✅ MySQL connected!');
}

// Contact form endpoint
app.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
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

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Anzo backend running ✅' });
});

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});