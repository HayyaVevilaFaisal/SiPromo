const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const cookieCsrf = require('./middlewares/cookieCsrf');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(cookieParser(process.env.JWT_SECRET));
app.use('/api', cookieCsrf);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  morgan.token('safe-url', req => req.path);
  app.use(morgan(':method :safe-url :status :response-time ms'));
}

// File lampiran bon pembelian (FR-15, NFR-12)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'API Pengelolaan Aset Promosi - Program Studi Informatika UNPAR' });
});

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;
