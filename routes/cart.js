const express = require("express");
const { 
  getCartItemsById, 
  addCartItem, 
  deleteProductFromCart, 
  addContactLensToCart, 
  getLocalCartData, 
  addMultipleCartItems, 
  getCartItemCountById, 
  updateCartQuantity, 
  addBlutoCart, 
  getPrescriptionFile,
  deletePrescriptionFile 
} = require("../controller/cartController");

// Router object
const router = express.Router();

// Get all cart products (protected route)
router.get("/myCart/:id",  getCartItemsById);

// Add items to cart (protected route)
router.post("/addToCart", addCartItem);

router.post("/addBluToCart", addBlutoCart);

router.delete("/deleteFromCart/:id", deleteProductFromCart);

router.post("/addContactLensToCart", addContactLensToCart);

router.post("/getLocalCartData", getLocalCartData);

router.post("/addMultipleCartData", addMultipleCartItems);

router.get("/cartCount/:id",  getCartItemCountById);

router.post('/updateQuantity', updateCartQuantity);

// Get prescription file
router.post('/getPrescriptionFile', getPrescriptionFile);

// Delete prescription file
router.post('/deletePrescriptionFile', deletePrescriptionFile);

module.exports = router;
