import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup (Optional - uses DATABASE_URL if provided)
const DATABASE_URL = process.env.DATABASE_URL;
let sequelize;

if (DATABASE_URL) {
    sequelize = new Sequelize(DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });

    sequelize.authenticate()
        .then(() => console.log('✅ Database connected'))
        .catch(err => console.error('❌ Database connection error:', err));
} else {
    console.log('ℹ️ No DATABASE_URL found. Running in local mode without DB.');
}

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'BillStor API is running' });
});

// Example route for receipts (placeholder)
app.get('/api/receipts', (req, res) => {
    res.json({ message: 'Receipts endpoint coming soon' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
