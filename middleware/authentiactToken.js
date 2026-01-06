const { verifyToken } = require("../auth/jwtUtils");

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  console.log("Received token:", token);  // Log the token to see if it's correct

  try {
    const payload = verifyToken(token, process.env.JWT_SECRET);  // Verify the token
    console.log("Decoded payload:", payload);  // Log the decoded payload

    req.user = payload;  // Attach user info to request
    next();  // Proceed to the next middleware/route handler
  } catch (err) {
    console.error("Token verification error:", err);  // Log the error

    // Handle specific error cases
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }

    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = authenticateToken;
