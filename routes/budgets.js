const express = require('express');
const {
  getBudgets,
  addBudget,
  updateBudget,
  deleteBudget
} = require('../controllers/budgets');

const router = express.Router();

const { verifyAccessToken } = require('../middleware/auth');

router
  .route('/')
  .get(verifyAccessToken, getBudgets)
  .post(verifyAccessToken, addBudget);

router
  .route('/:id')
  .put(verifyAccessToken, updateBudget)
  .delete(verifyAccessToken, deleteBudget);

module.exports = router;
