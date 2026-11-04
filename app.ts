import express, { Application } from 'express';
import cors from 'cors';
import connectDB from './config/db';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import { signingSecret } from './utils/token';
signingSecret();

const app: Application = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  console.log('headers', req.headers);
  console.log('body', req.body);
  next();
});

// Routes
import deviceRoutes from './routes/device.routes';
import categoryRoutes from './routes/category.routes';
import pornstarRoutes from './routes/pornstar.routes';
import videoRoutes from './routes/video.routes';
import legalRoutes from './routes/legal.routes';
import contactRoutes from './routes/contact.routes';
import adminRoutes from './routes/admin.routes';

const prefix = '/api/v1';

app.use(`${prefix}/legal`, legalRoutes);
app.use(`${prefix}/contact`, contactRoutes);
app.use(`${prefix}/device`, deviceRoutes);
app.use(`${prefix}/app/categories`, categoryRoutes);
app.use(`${prefix}/app/pornstars`, pornstarRoutes);
app.use(`${prefix}/app/videos`, videoRoutes);
app.use(`${prefix}/admin`, adminRoutes);

// --- 404 last ---
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route Not Found',
  });
});

// Connect to Database
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
