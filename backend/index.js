require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const cluster = require('cluster');
const os = require('os');
const connectDB = require('./db/connect');
const errorHandler = require('./middleware/error.middleware');
const { autoInvalidateCache, cacheMiddleware } = require('./middleware/cache.middleware');

// Route imports
const authRoutes = require('./routes/auth.routes');
const leadsRoutes = require('./routes/leads.routes');
const projectsRoutes = require('./routes/projects.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const activitiesRoutes = require('./routes/activities.routes');
const siteVisitsRoutes = require('./routes/sitevisits.routes');
const bookingRoutes = require('./routes/booking.routes');
const paymentsRoutes = require('./routes/payments.routes');
const channelPartnersRoutes = require('./routes/channelpartners.routes');
const usersRoutes = require('./routes/users.routes');
const reportsRoutes = require('./routes/reports.routes');
const campaignsRoutes = require('./routes/campaigns.routes');
const metaIntegrationRoutes = require('./routes/metaIntegration.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const buyerRequirementsRoutes = require('./routes/buyerRequirements.routes');

const app = express();

// Connect to MongoDB
connectDB();

// High Performance & Traffic Load Balancing Middleware
app.use(helmet({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression({ level: 6, threshold: 1024 })); // Gzip payloads > 1KB

// Rate Limiting (DDoS & Traffic Spikes Smoothing)
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 1000, // max 1000 requests per minute per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // max 100 login attempts per 15 minutes per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again in 15 minutes.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/superadmin-login', authLimiter);

// CORS & Body Parsers
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Auto-Invalidate cache on write mutations
app.use('/api', autoInvalidateCache);

// Health check with system metrics
app.get('/api/health', (req, res) => res.json({
  status: 'OK',
  timestamp: new Date(),
  version: '1.0.0',
  uptimeSeconds: Math.floor(process.uptime()),
  memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  cpuCores: os.cpus().length
}));

// API Routes (with selective fast caching on high-frequency read endpoints)
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/projects', cacheMiddleware(10), projectsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', cacheMiddleware(15), dashboardRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/site-visits', siteVisitsRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/channel-partners', channelPartnersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', cacheMiddleware(15), reportsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/integrations/meta', metaIntegrationRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/buyer-requirements', buyerRequirementsRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Multi-Worker Clustering Support for High Concurrency (Opt-In via CLUSTER_MODE=true)
if (require.main === module) {
  if (process.env.CLUSTER_MODE === 'true' && cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    console.log(`⚡ Primary cluster process running. Forking across ${numCPUs} CPU cores for load balancing...`);
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    cluster.on('exit', (worker) => {
      console.warn(`Worker ${worker.process.pid} exited. Spawning replacement worker...`);
      cluster.fork();
    });
  } else {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Real Estate CRM Server running on http://localhost:${PORT} [PID: ${process.pid}]`);
      console.log(`🛡️ Rate Limiting & Compression: ACTIVE`);
      console.log(`⚡ Connection Pooling: ACTIVE`);
      console.log(`📊 Node Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use by another running instance.`);
        console.error(`💡 Freeing port or specify a different PORT in .env`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  }
}

module.exports = app;
