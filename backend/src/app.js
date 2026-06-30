const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize app
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim().replace(/\/$/, '')) // Trim and remove trailing slash
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, Postman)
    if (!origin) return callback(null, true);
    
    // Normalize origin by removing trailing slash
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Route Files
const auth = require('./routes/auth');
const services = require('./routes/services');
const cart = require('./routes/cart');
const requests = require('./routes/requests');
const admin = require('./routes/admin');
const notifications = require('./routes/notifications');

// Mount Routers
app.use('/api/auth', auth);
app.use('/api/services', services);
app.use('/api/cart', cart);
app.use('/api/requests', requests);
app.use('/api/admin', admin);
app.use('/api/notifications', notifications);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Shager Wedding API is healthy' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Try multiple possible paths for the frontend build
  const possiblePaths = [
    path.join(__dirname, '../../frontend/dist'),
    path.join(__dirname, '../frontend/dist'),
    path.join(__dirname, 'frontend/dist')
  ];

  let frontendPath = null;
  for (const p of possiblePaths) {
    try {
      require('fs').accessSync(p);
      frontendPath = p;
      break;
    } catch (e) {
      // Path doesn't exist, try next one
    }
  }

  if (frontendPath) {
    console.log(`Serving frontend from: ${frontendPath}`);
    app.use(express.static(frontendPath));

    app.get('*', (req, res) => {
      res.sendFile(path.resolve(frontendPath, 'index.html'));
    });
  } else {
    console.warn('Frontend build folder not found! API routes will still work.');
  }
}

// Centralized error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error occurred'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
