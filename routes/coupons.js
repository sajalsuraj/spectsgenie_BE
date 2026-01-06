const express = require("express");
const { getAllCoupons } = require("../controller/couponsController");

//router object
const router = express.Router();

//get all Coupons
router.get("/allCoupons", getAllCoupons);


module.exports = router