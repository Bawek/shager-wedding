const express = require('express');
const { getCategories, getServices, getServiceById } = require('../controllers/servicesController');

const router = express.Router();

router.get('/categories', getCategories);
router.get('/', getServices);
router.get('/:id', getServiceById);

module.exports = router;
