const express = require("express");
const { getAllProducts,gatAllBundelOffers,addRatings,updateRating,checkRating, getAllMaterial,getAllShape, getProductById, addProduct,getProductsByDynamicQuery,searchProduct, getWishlistStatusById, getSimilarProductsByCategory, getLocalData, getBrands } = require("../controller/productController");
// const authenticateToken = require("../middleware/authenticateToken"); // Import the middleware
const axios = require("axios"); // Import axios


// Router object
const router = express.Router();

// Function to generate Google Drive image URL
function generateGoogleDriveImageUrl(fileId) {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// Route to get image by Google Drive file ID
router.get("/getimage/:id", async (req, res) => {
    const fileId = req.params.id; // Get the file ID from the URL
    const imageUrl = generateGoogleDriveImageUrl(fileId); // Generate the image URL

    try {
        // Fetch the image from Google Drive
        const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
        
        // Set the appropriate content type
        res.set("Content-Type", response.headers["content-type"]);
        
        // Send the image data as the response
        res.send(response.data);
    } catch (error) {
        console.error("Error fetching image:", error.message);
        res.status(404).send("Image not found or access denied.");
    }
});

router.post("/addRating",  addRatings);

router.put("/updateRating",  updateRating);

router.get("/checkRating/:productId/:customerId",  checkRating);

router.post("/query", getProductsByDynamicQuery);
// Get all products
router.get("/allProducts", getAllProducts);

router.get("/allMaterial", getAllMaterial);
router.get("/allShape", getAllShape);



router.post("/searchProducts", searchProduct);

router.get("/getBrands/:id", getBrands);

router.get("/getBundelOffer",gatAllBundelOffers)


// Get product by ID
router.get("/getProductById/:productId/:categoryId", getProductById);

router.get("/getSimilarProducts", getSimilarProductsByCategory);

// Add Product
router.post("/addProduct", addProduct);

router.get("/getWishlistStatus", getWishlistStatusById);

router.post("/getLocalData",  getLocalData);


module.exports = router;