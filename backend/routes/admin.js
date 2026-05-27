import express from 'express';
import User from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

// Get All System Users (Owners and Staff)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create New User (Owner or Staff)
router.post('/users', async (req, res) => {
  const { username, password, email, role, tenantId } = req.body;
  try {
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: 'Username already exists' });

    if (role === 'staff' && !tenantId) {
      return res.status(400).json({ message: 'Staff must be linked to an Owner (Tenant)' });
    }

    const userData = {
      username,
      password,
      email,
      role: role || 'owner'
    };

    if (role === 'staff') {
      userData.tenantId = tenantId;
    }

    const user = new User(userData);
    await user.save();
    res.status(201).json({ id: user._id, username: user.username, role: user.role, email: user.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete User
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
