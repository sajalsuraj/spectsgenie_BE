const db = require("../config/db");
const axios = require("axios");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();
const crypto = require("crypto");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../auth/jwtUtils");

const sendOTP = async (req, res) => {
  const { phoneNumber } = req.body;
  const formattedPhoneNumber = `91${phoneNumber}`;

  try {
    // Check if the user exists in the database
    const userExists = await db.query(
      "SELECT * FROM sg_customer_online WHERE mobile = ?",
      [phoneNumber]
    );
    console.log("user ", userExists[0]);
    if (userExists[0].length === 0) {
      return res.status(200).json({
        success: false,
        message: "user not found",
      });
    } else {
      // Generate OTP
      const otp = generateRandomSixDigitNumber();
      const url = "https://cloud.textonitsolutions.com/api/send";
      const params = {
        number: formattedPhoneNumber,
        type: "text",
        message: `Dear Customer, Your One-Time Password (OTP) for logging into SpectsGenie is: ${otp}. This OTP is valid for the next 10 minutes. Please do not share it with anyone.`,
        instance_id: process.env.INSTANCE_ID,
        access_token: process.env.WHATSAPP_ACCESS_TOKEN,
      };

      // Make the API call to send OTP
      const response = await axios.get(url, { params });

      if (response.data.status === "success") {
        // Save the OTP to the database
        await saveOTPToDatabase(phoneNumber, otp);


        return res.status(200).json({
          success: true,
          message: "OTP sent successfully",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Failed to send OTP. Please try again.",
        });
      }
    }
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response ? error.response.data : error.message
    );

    return res.status(500).json({
      success: false,
      error: "Failed to send OTP. Please try again.",
    });
  }
};

const verifyOTP = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  try {
    const data = await db.query(
      "SELECT otp,id,name FROM user_otp where mobile = ?",
      [phoneNumber]
    );
    if (!data) {
      res.status(404).send({
        success: false,
        message: "Something went wrong",
      });
    } else {
      console.log(data);
      let dbOtp = data[0][0]?.otp;
      let userName = data[0][0]?.name;
      let userId = data[0][0]?.id;
      console.log(dbOtp);
      console.log(otp);
      console.log(phoneNumber);

      if (dbOtp == otp) {
        const accessToken = generateAccessToken(userId, userName);
        const refreshToken = generateRefreshToken(userId, userName);
        res.status(200).send({
          success: true,
          message: "OTP verified successfully",
          accessToken: accessToken,
          refreshToken: refreshToken,
        });
      } else {
        res.status(400).send({
          success: false,
          message: "Incorrect OTP",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

const loginWithGoogle = async (req, res) => {
  const { token } = req.body;
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  try {
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log("Decoded Payload:", payload);

    const googleProfileId = payload["sub"];
    const email = payload["email"];
    const name = payload["name"];

    // Check if the user already exists
    const [existingUser] = await db.query(
      "SELECT * FROM sg_customer_online WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      // User exists, check if Google ID is already linked
      let user = existingUser[0];

      if (!user.google_profile_id) {
        // Update user with Google ID
        await db.query(
          "UPDATE sg_customer_online SET google_profile_id = ?, is_google_user = ? WHERE email = ?",
          [googleProfileId, 1, email]
        );
        user.google_profile_id = googleProfileId;
      } else if (user.google_profile_id !== googleProfileId) {
        return res.status(400).json({
          success: false,
          message: "Google profile does not match our records.",
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user.id, user.name);
      const refreshToken = generateRefreshToken(user.id, user.name);

      return res.status(200).json({
        success: true,
        message: "User logged in successfully.",
        accessToken,
        refreshToken,
      });
    } else {
      // User does not exist, create a new record
      const generated_code = generateUniqueCode();
      const query = `INSERT INTO sg_customer_online (name, email, is_google_user, google_profile_id, referral_code) VALUES (?, ?, ?, ?, ?)`;
      const result = await db.query(query, [
        name,
        email,
        1,
        googleProfileId,
        generated_code,
      ]);

      const userId = result[0].insertId;
      const accessToken = generateAccessToken(userId, name);
      const refreshToken = generateRefreshToken(userId, name);

      return res.status(201).json({
        success: true,
        message: "User registered and logged in successfully.",
        accessToken,
        refreshToken,
      });
    }
  } catch (error) {
    console.error("Error logging in with Google:", error);
    res.status(500).json({
      success: false,
      message: "Failed to log in with Google.",
      error: error.message,
    });
  }
};

function generateUniqueCode(length = 5) {
  // Prefix for the code
  const prefix = "SG-";

  // Get the current timestamp in milliseconds
  const timestamp = Date.now().toString(36); // Base-36 encoding of the timestamp

  // Generate random characters
  const randomBytes = crypto.randomBytes(Math.ceil(length / 2)); // Generate sufficient random bytes
  const randomChars = randomBytes.toString("hex").slice(0, length); // Convert to hex and trim to desired length

  // Combine prefix, timestamp, and random characters
  return `${prefix}${timestamp}-${randomChars}`;
}

function generateRandomSixDigitNumber() {
  return Math.floor(100000 + Math.random() * 900000);
}

const saveOTPToDatabase = async (phoneNumber, otp) => {
  const query =
    "INSERT INTO otp_tokens (phone_number, otp) VALUES (?, ?) ON DUPLICATE KEY UPDATE otp = VALUES(otp);";
  await db.query(query, [phoneNumber, otp, otp]);
};

module.exports = { sendOTP, verifyOTP, loginWithGoogle };
