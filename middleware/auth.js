import jwt from 'jsonwebtoken';

export function verifyJWT(req, res, next) {
  // Support HTTPOnly cookie as primary (Challenge 1) and Authorization header as fallback
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized access. Authentication token is missing.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized access. Token is invalid or expired.'
    });
  }
}
