const express = require("express");
const { getAllContactLens, getContactLensById } = require("../controller/contactLensController");
const authenticateToken = require("../middleware/authentiactToken"); // Import the middleware

//router object
const router = express.Router();

//get all cart products
router.get("/getAllContactLens",authenticateToken, getAllContactLens);

//Add items to cart
router.get("/getContactLensById/:id",authenticateToken, getContactLensById)


module.exports = router