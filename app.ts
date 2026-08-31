import express, { Application } from 'express';
import cors from 'cors';
import connectDB from './config/db';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const app: Application = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
import deviceRoutes from './routes/device.routes';
import categoryRoutes from './routes/category.routes';

const prefix = '/api/v1';

app.use(`${prefix}/device`, deviceRoutes);
app.use(`${prefix}/app/categories`, categoryRoutes);

// Base route
app.get('/{*any}', (req, res) => {
    res.send({
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