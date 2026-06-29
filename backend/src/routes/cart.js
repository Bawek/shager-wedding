const express = require('express');
const { getCart, addToCart, removeFromCart, clearCart } = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();

router.use(protect);
router.use(authorize('customer')); // Cart is customer-only

router.route('/')
  .get(getCart)
  .post(addToCart)
  .delete(clearCart);

router.delete('/:itemId', removeFromCart);

module.exports = router;
