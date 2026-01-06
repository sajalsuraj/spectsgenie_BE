const jwt = require('jsonwebtoken');

const generateAccessToken = (id,userName) => {
  return jwt.sign({ id: id, userName: userName }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const generateRefreshToken = (id,userName) => {
  return jwt.sign({ id: id, userName: userName}, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });
};

const verifyToken = (token, secret) => {
  try {
    console.log("token ",token)
    console.log("secret ", secret)
    return jwt.verify(token, secret);
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};

module.exports = { generateAccessToken, generateRefreshToken, verifyToken };
