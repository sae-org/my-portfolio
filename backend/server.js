const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'my_portfolio_db',
  user: process.env.DB_USER || 'saeeda',
  password: process.env.DB_PASSWORD || '',  // Empty string if no password
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Backend server is running',
  });
});

// Contact form submission endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  // Validate input
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'All fields (name, email, message) are required',
    });
  }

  try {
    // Insert into database
    const query = `
      INSERT INTO contact_messages (name, email, message, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    const values = [name, email, message];
    const result = await pool.query(query, values);

    console.log('✅ Message saved:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Thank you for your message! I\'ll get back to you soon.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error saving message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save message. Please try again.',
    });
  }
});

// Get all contact messages (optional - for admin view)
app.get('/api/contact/messages', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
    });
  }
});

// Serve React app for all non-API routes (must be last!)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend available at http://localhost:${PORT}`);
});

