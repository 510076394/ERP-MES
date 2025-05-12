const { orders } = require('../config/db');

const getOrders = (req, res) => {
  res.json(orders);
};

const createOrder = (req, res) => {
  const { customer_id, order_date, delivery_date, total_amount, status, remark, items } = req.body;

  const newOrder = {
    id: orders.length + 1,
    customer_id,
    order_date,
    delivery_date,
    total_amount,
    status: status || 'pending',
    remark,
    items: items.map(item => ({
      material_code: item.material_code,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.amount
    })),
    createdAt: new Date().toISOString().split('T')[0]
  };

  orders.push(newOrder);
  res.status(201).json(newOrder);
};

const updateOrder = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = orders.find(o => o.id === parseInt(id));

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  order.status = status || order.status;
  res.json(order);
};

module.exports = {
  getOrders,
  createOrder,
  updateOrder
};