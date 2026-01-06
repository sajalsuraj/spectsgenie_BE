const express = require('express');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('../auth/jwtUtils');
const pool = require('../config/db'); // Import the MySQL pool

const router = express.Router();

// Login API
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  console.log("Request body:", req.body); // Log request body

  // Validate inputs
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // Query the sg_customer_online table to get the user by email
    const [rows] = await pool.execute(
      `SELECT id, name, password FROM sg_customer_online WHERE email = ?`,
      [username]
    );

    const user = rows[0];

    console.log("Found user:", user); // Log the user found

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    console.log("Password match result:", passwordMatch); // Log the bcrypt compare result

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const message = "success";

    // Save tokens into the authentication_details table using raw SQL query
    // await pool.execute(
    //   `INSERT INTO authentication_details (user_name, token, refresh_token) 
    //   VALUES (?, ?, ?)`,
    //   [user.username, accessToken, refreshToken]
    // );

    res.json({ message, accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing login request' });
  }
});

// Logout API
router.post('/logout', async (req, res) => {
  const { username, refreshToken } = req.body;

  console.log("Request body:", req.body); // Log request body

  // Validate inputs
  if (!username || !refreshToken) {
    return res.status(400).json({ message: 'Username and refresh token are required' });
  }

  try {
    // Delete the tokens from the database for the specified user
    const [results] = await pool.execute(
      `DELETE FROM authentication_details WHERE user_name = ? AND refresh_token = ?`,
      [username, refreshToken]
    );

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'No matching session found to log out' });
    }

    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error logging out' });
  }
});

module.exports = router;
