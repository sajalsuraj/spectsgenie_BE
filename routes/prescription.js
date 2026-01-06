const express = require("express");
const { addPrescription,getPrescription,deletePrescription, uploadPrescriptionFile, uploadMiddleware } = require("../controller/prescriptionController");

// Router object
const router = express.Router();

// Get all cart products (protected route)
// router.get("/myPrescriptions/:id",  getCartItemsById);

// Add items to cart (protected route)
router.post("/addPrescription", addPrescription);

router.get("/getPrescription/:id", getPrescription);
router.delete("/deletePrescription/:id", deletePrescription);




// Upload prescription file - ADD THE MIDDLEWARE
router.post("/savePrescriptionFile", uploadMiddleware, uploadPrescriptionFile);

// router.delete("/deleteFromCart/:id", deleteProductFromCart);

module.exports = router;
