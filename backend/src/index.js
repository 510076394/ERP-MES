require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const ordersRoutes = require('./routes/orders');
const productionRoutes = require('./routes/production');
const salesRoutes = require('./routes/sales');
const baseDataRoutes = require('./routes/baseData');
const inventoryRoutes = require('./routes/inventory');
const locationsRoutes = require('./routes/locations');
const purchaseRoutes = require('./routes/purchaseRoutes');
const qualityRoutes = require('./routes/qualityRoutes');
const financeRoutes = require('./routes/financeRoutes');
const systemRoutes = require('./routes/system');
const todoRoutes = require('./routes/todoRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/baseData', baseDataRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/todos', todoRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});