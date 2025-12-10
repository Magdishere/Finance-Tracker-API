const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

exports.getBudgets = async (req, res) => {
  const db = getDB();
  try {
    const budgets = await db.collection('budgets').find({
      userId: new ObjectId(req.user.id),
    }).toArray();

    const budgetsWithUsage = await Promise.all(
      budgets.map(async (budget) => {
        const [year, month] = budget.month.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1); // Month is 0-indexed
        const endDate = new Date(year, month, 0); // Last day of the month

        const pipeline = [
          {
            $match: {
              userId: new ObjectId(req.user.id),
              type: 'expense',
              date: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: null,
              totalExpenses: { $sum: '$amount' },
            },
          },
        ];

        const transactionUsage = await db.collection('transactions').aggregate(pipeline).toArray();
        const usage = transactionUsage.length > 0 ? transactionUsage[0].totalExpenses : 0;
        const usagePercentage = (usage / budget.limitAmount) * 100;

        return {
          ...budget,
          usage,
          usagePercentage: isNaN(usagePercentage) ? 0 : usagePercentage,
        };
      })
    );

    res.status(200).json({ success: true, data: budgetsWithUsage });
  } catch (err) {
    console.error('Error fetching budgets:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.addBudget = async (req, res) => {
  const db = getDB();
  const { month, limitAmount } = req.body;

  const newBudget = {
    userId: new ObjectId(req.user.id),
    month,
    limitAmount: parseFloat(limitAmount),
    createdAt: new Date(),
  };

  const result = await db.collection('budgets').insertOne(newBudget);
  const budget = await db.collection('budgets').findOne({ _id: result.insertedId });

  res.status(201).json({ success: true, data: budget });
};

exports.updateBudget = async (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const budget = await db.collection('budgets').findOne({ _id: new ObjectId(id) });
  if (!budget) return res.status(404).json({ success: false });

  if (budget.userId.toString() !== req.user.id)
    return res.status(401).json({ success: false });

  await db.collection('budgets').updateOne(
    { _id: new ObjectId(id) },
    { $set: { limitAmount: parseFloat(req.body.limitAmount) } }
  );

  const updated = await db.collection('budgets').findOne({ _id: new ObjectId(id) });
  res.status(200).json({ success: true, data: updated });
};

exports.deleteBudget = async (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const budget = await db.collection('budgets').findOne({ _id: new ObjectId(id) });
  if (!budget) return res.status(404).json({ success: false });

  if (budget.userId.toString() !== req.user.id)
    return res.status(401).json({ success: false });

  await db.collection('budgets').deleteOne({ _id: new ObjectId(id) });
  res.status(200).json({ success: true });
};
