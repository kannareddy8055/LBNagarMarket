import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mandi_erp_secret_key_2026';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[AUTH] Missing or invalid token header'.red);
    return res.status(401).json({ message: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.tenantId && decoded.role !== 'admin') {
      console.warn('[AUTH] Token missing tenantId for owner/staff'.yellow);
      // For legacy tokens or edge cases, fallback to user id if they are an owner
      if (decoded.role === 'owner') decoded.tenantId = decoded.id;
    }
    req.user = decoded; 
    next();
  } catch (err) {
    console.error('[AUTH] JWT Verification failed:'.red, err.message);
    return res.status(403).json({ message: 'Forbidden: Token expired or invalid' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};

// Prevent staff from editing/deleting (Safety Lock)
export const restrictStaff = (req, res, next) => {
  if (req.user && req.user.role === 'staff') {
    const allowedMethods = ['GET', 'POST'];
    if (!allowedMethods.includes(req.method)) {
      console.warn(`[SECURITY] Staff user ${req.user.username} blocked from ${req.method} on ${req.originalUrl}`.red);
      return res.status(403).json({ message: 'Safety Constraint: Staff members are restricted from editing or deleting data to prevent misuse.' });
    }
  }
  next();
};
