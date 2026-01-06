const express = require("express");
const { sendOTP, verifyOTP, loginWithGoogle } = require("../controller/loginController");

const router = express.Router();

//login
router.post("/login", sendOTP);

router.post("/googleLogin", loginWithGoogle);

//verify otp
router.post("/verifyOtp", verifyOTP);


module.exports = router