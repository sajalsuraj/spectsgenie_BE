const db = require("../config/db");

//Get Wishlist items by ID
const getWishlistItemsById = async (req,res) => {
    try {
        const customerId = req.params.id;
        const data = await db.query("SELECT * FROM wishlist_product_details WHERE customer_id = ?",[customerId] );
        if(!data){
            res.status(404).send({
                success: false,
                message: "No records found"
            })
        }else{
            res.status(200).send({
                success: true,
                message: "Records fetched",
                data: data[0],
                totalRecords: data[0].length
            })
        }
    } catch (error) {
        console.log(error);
        res.status(400).send({
            success: false,
            message: "Something went wrong",
            error
        })
    }
}

//Add Product to Wishlist
const addWishlistItem = async (req, res) => {
    try {
        const { product_id, customer_id, ca_id } = req.body;

        // Input validation
        if (!product_id || !customer_id) {
            console.log("Validation failed:", req.body);
            return res.status(400).json({
                success: false,
                message: "Required fields are missing: product_id, customer_id, is_active, ca_id",
            });
        }

        const sqlQuery = `
            INSERT INTO sg_wishlist (
                product_id, customer_id, is_active, ca_id
            ) VALUES (?, ?, ?, ?)
        `;

        const values = [product_id, customer_id, 'true', ca_id];

        console.log("Executing query...");
        const result = await db.query(sqlQuery, values); 

        console.log("Query successful:", result);

        res.status(201).json({
            success: true,
            message: "Wishlist item added successfully",
            wishlistItemId: result.insertId,
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred",
            error: error.message,
        });
    }
};

const deleteProductFromWishlist = async (req, res) => {
    try {
        // Extract product_id and customer_id from the request body
        const { product_id, customer_id } = req.body;

        // Input validation
        if (!product_id || !customer_id) {
            console.log("Validation failed: product_id or customer_id is missing");
            return res.status(400).json({
                success: false,
                message: "Product ID and Customer ID are required",
            });
        }

        const sqlQuery = `DELETE FROM sg_wishlist WHERE product_id = ? AND customer_id = ?`;

        console.log("Executing query...");
        const result = await db.query(sqlQuery, [product_id, customer_id]); // Assuming `db.query` supports promises

        if (result.affectedRows === 0) {
            console.log("No wishlist item found with the given product_id and customer_id");
            return res.status(404).json({
                success: false,
                message: "No wishlist item found with the given Product ID and Customer ID",
            });
        }

        console.log("Query successful, rows affected:", result.affectedRows);

        res.status(200).json({
            success: true,
            message: "Wishlist item deleted successfully",
            affectedRows: result.affectedRows,
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred",
            error: error.message,
        });
    }
};

const deleteById = async (req, res) => {
    try {
        console.log("Start of function");

        const id = req.params.id;

        // Input validation
        if (!id) {
            console.log("Validation failed: id is missing");
            return res.status(400).json({
                success: false,
                message: "wishlist ID is required",
            });
        }

        const sqlQuery = `DELETE FROM sg_wishlist WHERE id = ?`;

        console.log("Executing query...");
        const result = await db.query(sqlQuery, [id]); // Assuming `db.query` supports promises

        if (result.affectedRows === 0) {
            console.log("No wishlist item found with the given ID:", id);
            return res.status(404).json({
                success: false,
                message: "No wishlist item found with the given ID",
            });
        }

        console.log("Query successful, rows affected:", result.affectedRows);

        res.status(200).json({
            success: true,
            message: "Item deleted successfully",
            affectedRows: result.affectedRows,
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred",
            error: error.message,
        });
    }
};

const addMultipleWishlistItems = async (req, res) => {
    try {
        const wishlistItems = req.body;

        if (!Array.isArray(wishlistItems) || wishlistItems.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid payload format or empty array." });
        }

        const sqlQuery = `INSERT INTO sg_wishlist (product_id, customer_id, is_active, ca_id) VALUES ? 
                          ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)`;

        const values = wishlistItems.map(item => [
            item.product_id,
            item.customer_id,
            item.is_active || 'true',
            item.ca_id
        ]);

        const [result] = await db.query(sqlQuery, [values]);

        res.status(201).json({
            success: true,
            message: `${result.affectedRows} wishlist items added successfully.`
        });
    } catch (error) {
        console.error("Error inserting wishlist items:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while inserting wishlist items.",
            error: error.message
        });
    }
};



module.exports = {addWishlistItem , getWishlistItemsById, deleteProductFromWishlist, deleteById, addMultipleWishlistItems};