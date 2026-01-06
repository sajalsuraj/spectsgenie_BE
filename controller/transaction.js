const db = require("../config/db");

//Add Product to cart
const addTransactionDetails = async (req, res) => {
    try {
        console.log("Start of function");
        const {transactionId, code, providerReferenceId, order_id, created_at } = req.body;

        // Input validation
        if (!transactionId || !code || !providerReferenceId || !order_id) {
            console.log("Validation failed:", req.body);
            return res.status(400).json({
                success: false,
                message: "Required fields are missing",
            });
        }
        const sqlQuery = `
            INSERT INTO sg_order_transactions (
                transactionId, code, providerReferenceId, order_id, created_at
            ) VALUES (?, ?, ?, ?, ?)
        `;

        const values = [transactionId, code, providerReferenceId, order_id, created_at];

        console.log("Executing query...");
        const result = await db.query(sqlQuery, values); // Directly use db.query without promisify

        console.log("Query successful:", result);

        res.status(201).json({
            success: true,
            message: "transaction added successfully",
            cartItemId: result.insertId,
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








module.exports = {addTransactionDetails};