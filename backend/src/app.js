const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
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
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'https://shager-wedding.onrender.com'],
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
