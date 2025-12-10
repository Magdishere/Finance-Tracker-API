const express = require('express');
const {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction
} = require('../controllers/transactions');

const router = express.Router();

const { verifyAccessToken } = require('../middleware/auth');

router
  .route('/')
  .get(verifyAccessToken, getTransactions)
  .post(verifyAccessToken, addTransaction);

router
  .route('/:id')
  .put(verifyAccessToken, updateTransaction)
  .delete(verifyAccessToken, deleteTransaction);

module.exports = router;
