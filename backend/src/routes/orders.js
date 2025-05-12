const express = require('express');
const router = express.Router();
const { getOrders, createOrder, updateOrder } = require('../controllers/ordersController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getOrders);
router.post('/', createOrder);
router.put('/:id', updateOrder);

module.exports = router;