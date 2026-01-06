const express = require("express");
const { addAddress, deleteAddress, getAddressById, editAddress } = require("../controller/addressController");

// Router object
const router = express.Router();

// Add items to cart (protected route)
router.post("/addAddress", addAddress);

router.delete("/deleteAddress/:id", deleteAddress);

router.get("/getAddressById/:id", getAddressById)

router.post("/editAddress",  editAddress)

module.exports = router;