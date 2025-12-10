const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

const BCRYPT_SALT = parseInt(process.env.BCRYPT_SALT, 10) || 10;

// @desc      Get current user's profile
// @route     GET /api/users/profile
// @access    Private
exports.getProfile = async (req, res) => {
    try {
        const db = getDB();
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(req.user.id) },
            { projection: { password: 0 } } // don't return password
        );

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.status(200).json({ success: true, data: { id: user._id.toString(), ...user } });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc      Update current user's profile
// @route     PUT /api/users/profile
// @access    Private
exports.updateProfile = async (req, res) => {
    try {
        const db = getDB();
        const { name, email, password } = req.body;

        const updateFields = {};
        if (name) updateFields.name = name;
        if (email) updateFields.email = email;
        if (password) {
            const hash = await bcrypt.hash(password, BCRYPT_SALT);
            updateFields.password = hash;
        }

        const result = await db.collection('users').findOneAndUpdate(
            { _id: new ObjectId(req.user.id) },
            { $set: updateFields },
            { returnDocument: 'after', projection: { password: 0 } } // return updated user without password
        );

        res.status(200).json({ success: true, data: result.value });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
