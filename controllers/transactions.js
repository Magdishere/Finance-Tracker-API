const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// @desc      Get all transactions
// @route     GET /api/transactions
// @access    Private
exports.getTransactions = async (req, res, next) => {
    const db = getDB();
    const { type, category, startDate, endDate, search } = req.query;
    const query = { userId: new ObjectId(req.user.id) };

    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate && endDate) {
        query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (search) {
        query.description = { $regex: search, $options: 'i' };
    }

    try {
        const transactions = await db
            .collection('transactions')
            .find(query)
            .sort({ date: -1 })
            .toArray();

        res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (err) {
        console.error('Get transactions error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc      Add transaction
// @route     POST /api/transactions
// @access    Private
exports.addTransaction = async (req, res, next) => {
    const db = getDB();
    const { type, category, amount, date, description } = req.body;

    const newTransaction = {
        userId: new ObjectId(req.user.id), // <-- fixed
        type,
        category,
        amount: parseFloat(amount),
        date: new Date(date),
        description,
        createdAt: new Date(),
    };

    try {
        const result = await db.collection('transactions').insertOne(newTransaction);
        const transaction = await db
            .collection('transactions')
            .findOne({ _id: result.insertedId });

        res.status(201).json({ success: true, data: transaction });
    } catch (err) {
        console.error('Add transaction error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc      Update transaction
// @route     PUT /api/transactions/:id
// @access    Private
exports.updateTransaction = async (req, res, next) => {
    const db = getDB();
    const { id } = req.params;
    const { type, category, amount, date, description } = req.body;

    try {
        const transaction = await db
            .collection('transactions')
            .findOne({ _id: new ObjectId(id) });

        if (!transaction) {
            return res.status(404).json({ success: false, message: `No transaction found with id ${id}` });
        }

        // Ensure user owns transaction
        if (transaction.userId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized to update this transaction' });
        }

        const updatedFields = {
            type,
            category,
            amount: parseFloat(amount),
            date: new Date(date),
            description,
        };

        await db.collection('transactions').updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedFields }
        );

        const updatedTransaction = await db
            .collection('transactions')
            .findOne({ _id: new ObjectId(id) });

        res.status(200).json({ success: true, data: updatedTransaction });
    } catch (err) {
        console.error('Update transaction error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc      Delete transaction
// @route     DELETE /api/transactions/:id
// @access    Private
exports.deleteTransaction = async (req, res, next) => {
    const db = getDB();
    const { id } = req.params;

    try {
        const transaction = await db
            .collection('transactions')
            .findOne({ _id: new ObjectId(id) });

        if (!transaction) {
            return res.status(404).json({ success: false, message: `No transaction found with id ${id}` });
        }

        // Ensure user owns transaction
        if (transaction.userId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized to delete this transaction' });
        }

        await db.collection('transactions').deleteOne({ _id: new ObjectId(id) });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        console.error('Delete transaction error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
