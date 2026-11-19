import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.js';
import { progressRouter } from './routes/progress.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { adminRouter } from './routes/admin.js';
import { playerRouter } from './routes/player.js';
import { quickQuizRouter } from './routes/quickQuiz.js';
import { shopRouter } from './routes/shop.js';
import { charactersRouter } from './routes/characters.js';
import { clientLogRouter } from './routes/clientLog.js';
import { scheduleDailyBonus } from './cron/dailyBonus.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/progress', progressRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/player', playerRouter);
app.use('/api/quick-quiz', quickQuizRouter);
app.use('/api/shop', shopRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/client-log', clientLogRouter);

scheduleDailyBonus();

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`nong-din-dee API listening on :${port}`));
