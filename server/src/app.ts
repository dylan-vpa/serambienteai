import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import path from 'path';

import routes from './routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', routes);

app.get('/', (req, res) => {
    res.send('Paradixe ALS V2 API');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

export default app;
