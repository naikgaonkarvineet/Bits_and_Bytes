require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Routes
const authRoutes = require('./routes/authRoutes');
const workerRoutes = require('./routes/workerRoutes');
const contractorRoutes = require('./routes/contractorRoutes');
const jobRoutes = require('./routes/jobRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration (allow all origins in development and file:// protocol)
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for visibility
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    app: 'KaamSetu Backend API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/payments', paymentRoutes);

// Serve Frontend Static Files (HTML, CSS, JS from parent root directory)
const frontendPath = path.resolve(__dirname, '..');
app.use(express.static(frontendPath));

// Fallback for API 404
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found.`
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`
======================================================
🔨 KaamSetu Backend API running on port ${PORT}
🚀 Base URL: http://localhost:${PORT}/api
🌐 Frontend: http://localhost:${PORT}/index.html
======================================================
    `);
  });
}

module.exports = app;
