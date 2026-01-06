const express = require("express");
const { getLensTypes, getLensPackages, getLensPackageUpgradeById } = require("../controller/lensTypesController");

//router object
const router = express.Router();

//get all cart products
router.get("/getLensTypesById/:id", getLensTypes);

//Add items to cart
router.get("/getLensPackageById/:id/:caId", getLensPackages)

//Get lens package upgrade by ID
router.get("/getLensPackageUpgradeById/:id", getLensPackageUpgradeById)

module.exports = router