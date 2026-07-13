const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// File lampiran bon pembelian (FR-15, NFR-12)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'API Pengelolaan Aset Promosi - Program Studi Informatika UNPAR' });
});

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;
