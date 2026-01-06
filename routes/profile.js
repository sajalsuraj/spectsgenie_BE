const express = require("express");
const { getProfileDetails,getRefId,checkIfEmailOrMobileExists } = require("../controller/profileController");
const authenticateToken = require("../middleware/authentiactToken"); // Import the middleware

const router = express.Router();

//get Profile Details
router.get("/getProfileDetails/:id", authenticateToken, getProfileDetails);
router.get("/getRefId/:id", getRefId);
router.get("/checkIfEmailOrMobileExists/:identifier", checkIfEmailOrMobileExists);



module.exports = router