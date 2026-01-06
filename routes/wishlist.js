const express = require("express");
const authenticateToken = require("../middleware/authentiactToken"); // Import the middleware
const { addWishlistItem, getWishlistItemsById, deleteProductFromWishlist, deleteById, addMultipleWishlistItems } = require("../controller/wishlistController");

// Router object
const router = express.Router();

// Get all cart products (protected route)
router.get("/myWishlist/:id",  getWishlistItemsById);

// Add items to cart (protected route)
router.post("/addWishlistItem",  addWishlistItem);

router.delete("/deleteWishlistItem",  deleteProductFromWishlist);

router.delete("/deleteById/:id",  deleteById);

router.post("/addMultipleWishlistData",  addMultipleWishlistItems);

module.exports = router;
