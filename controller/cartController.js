const db = require("../config/db");
const fs = require('fs');
const path = require('path');

//Get Cart items by ID
const getCartItemsById = async (req, res) => {
  try {
    const customerId = req.params.id;
    const data = await db.query(
      "SELECT * FROM cart_product_details WHERE customer_id = ?",
      [customerId]
    );
    if (!data) {
      res.status(404).send({
        success: false,
        message: "No records found",
      });
    } else {
      res.status(200).send({
        success: true,
        message: "Records fetched",
        data: data[0],
        totalRecords: data[0].length,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

//Add Product to cart
const addCartItem = async (req, res) => {
  try {
    const {
      product_id,
      lens_package_id,
      price,
      customer_id,
      lens_type_id,
      ca_id,
      prescription,
      upgrade_id
    } = req.body;

    // Input validation
    if (
      !product_id ||
      !lens_package_id ||
      !price ||
      !customer_id ||
      !lens_type_id ||
      !ca_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Required fields are missing: product_id, lens_package_id, price, customer_id, lens_type_id",
      });
    }
    const sqlQuery = `
            INSERT INTO sg_cart (
                product_id, lens_package_id, price, customer_id, lens_type_id, ca_id, prescription,upgrade_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)ON DUPLICATE KEY UPDATE 
                quantity = quantity + VALUES(quantity)
        `;

    // Stringify the prescription object if it exists
    const prescriptionValue = prescription
      ? JSON.stringify(prescription)
      : null;

    const values = [
      product_id,
      lens_package_id,
      price,
      customer_id,
      lens_type_id,
      ca_id,
      prescriptionValue,
      upgrade_id
    ];

    const result = await db.query(sqlQuery, values); // Directly use db.query without promisify

    res.status(201).json({
      success: true,
      message: "Cart item added successfully",
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

const addBlutoCart = async (req, res) => {
  try {
    const {
      product_id,
      price,
      customer_id,
      ca_id
    } = req.body;

    // Input validation
    if (
      !product_id ||
      !price ||
      !customer_id ||
      !ca_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Required fields are missing: product_id, price, customer_id",
      });
    }
    const sqlQuery = `
            INSERT INTO sg_cart (
                product_id, price, customer_id, ca_id
            ) VALUES (?, ?, ?, ?)ON DUPLICATE KEY UPDATE 
                quantity = quantity + VALUES(quantity)
        `;


    const values = [
      product_id,
      price,
      customer_id,
      ca_id,
    ];

    const result = await db.query(sqlQuery, values); // Directly use db.query without promisify

    res.status(201).json({
      success: true,
      message: "Cart item added successfully",
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

const deleteProductFromCart = async (req, res) => {
  try {
    console.log("Start of function");

    const cartId = req.params.id;

    // Input validation
    if (!cartId) {
      console.log("Validation failed: cartId is missing");
      return res.status(400).json({
        success: false,
        message: "Cart ID is required",
      });
    }

    const sqlQuery = `DELETE FROM sg_cart WHERE id = ?`;

    console.log("Executing query...");
    const result = await db.query(sqlQuery, [cartId]); // Assuming `db.query` supports promises

    if (result.affectedRows === 0) {
      console.log("No cart item found with the given ID:", cartId);
      return res.status(404).json({
        success: false,
        message: "No cart item found with the given ID",
      });
    }

    console.log("Query successful, rows affected:", result.affectedRows);

    res.status(200).json({
      success: true,
      message: "Cart item deleted successfully",
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

const addContactLensToCart = async (req, res) => {
  try {
    console.log("Start of function");
    const { product_id, quantity, price, customer_id, ca_id, prescription } =
      req.body;

    // Input validation
    if (!product_id || !price || !customer_id) {
      console.log("Validation failed:", req.body);
      return res.status(400).json({
        success: false,
        message: "Required fields are missing: product_id, price, customer_id",
      });
    }

    const sqlQuery = `
            INSERT INTO sg_cart (
                product_id, quantity, price, customer_id, ca_id, prescription
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                quantity = quantity + VALUES(quantity)
        `;

    // Stringify the prescription object if it exists
    const prescriptionValue = prescription
      ? JSON.stringify(prescription)
      : null;

    const values = [
      product_id,
      quantity || 1,
      price,
      customer_id,
      ca_id,
      prescriptionValue,
    ];

    console.log("Executing query...");
    const result = await db.query(sqlQuery, values);

    console.log("Query successful:", result);

    res.status(201).json({
      success: true,
      message: "Cart item added successfully",
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

const getLocalCartData = async (req, res) => {
  try {
    const payload = req.body; // Array of objects from the request body

    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).send({
        success: false,
        message: "Invalid or empty payload",
      });
    }

    // Array to hold all results
    const queryResults = [];

    for (const item of payload) {
      const { product_id, ca_id } = item;

      if (!product_id || !ca_id || isNaN(product_id) || isNaN(ca_id)) {
        return res.status(400).send({
          success: false,
          message: "Invalid product_id or ca_id in payload",
        });
      }

      let queryResult;
      if (Number(ca_id) === 3) {
        // Query for categoryId 3
        queryResult = await db.query(
          `SELECT * FROM cart_temp_lens WHERE product_id = ?`,
          [product_id]
        );
      } else {
        // Query for other categories
        queryResult = await db.query(
          `SELECT * FROM cart_temp_products WHERE product_id = ?`,
          [product_id]
        );
      }

      // Flatten and push the results into the same array
      if (queryResult && Array.isArray(queryResult)) {
        queryResults.push(...queryResult[0]);
      }
    }

    if (queryResults.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No records found",
        data: [],
        totalRecords: 0,
      });
    }

    return res.status(200).send({
      success: true,
      message: "Records fetched",
      data: queryResults, // Flat structure for all records
      totalRecords: queryResults.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const addMultipleCartItems = async (req, res) => {
  try {
    const cartItems = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid payload format or empty array.",
        });
    }

    const sqlQuery = `INSERT INTO sg_cart (product_id, lens_package_id, price, customer_id, lens_type_id, ca_id, quantity,prescription) VALUES ?`;

    const values = cartItems.map((item) => [
      item.product_id,
      item.lens_package_id || null,
      item.price || null,
      item.customer_id,
      item.lens_type_id || null,
      item.ca_id,
      item.quantity || 1,
      item.prescription ? JSON.stringify(item.prescription) : null,
    ]);

    const [result] = await db.query(sqlQuery, [values]);

    res.status(201).json({
      success: true,
      message: `${result.affectedRows} cart items added successfully.`,
    });
  } catch (error) {
    console.error("Error inserting cart items:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while inserting cart items.",
      error: error.message,
    });
  }
};

const getCartItemCountById = async (req, res) => {
  try {
    const customerId = req.params.id;
    const [rows] = await db.query(
      "SELECT COUNT(*) AS itemCount FROM sg_cart WHERE customer_id = ?",
      [customerId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No records found",
        totalItems: 0,
      });
    }

    res.status(200).send({
      success: true,
      message: "Cart item count fetched",
      totalItems: rows[0].itemCount, // Extracting the count properly
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const { id, quantity } = req.body;
    console.log("id ", id);
    console.log("quantity ", quantity);

    //   if (!id || !quantity) {
    //     return res.status(400).send({
    //       success: false,
    //       message: 'Missing required fields',
    //     });
    //   }

    const [result] = await db.query(
      "UPDATE sg_cart SET quantity = ? WHERE id = ?",
      [quantity, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        message: "Cart item not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Cart updated successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

// Delete prescription file
const deletePrescriptionFile = async (req, res) => {
  try {
    // Accept both filePath and prescriptionFilePath for backward compatibility
    const filePath = req.body.filePath || req.body.prescriptionFilePath;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'File path is required. Please provide either filePath or prescriptionFilePath in the request body'
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found at the specified path',
        filePath: filePath
      });
    }

    // Delete the file
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return res.status(500).json({
          success: false,
          message: 'Error deleting file',
          error: err.message
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
        filePath: filePath
      });
    });
  } catch (error) {
    console.error('Error in deletePrescriptionFile:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the file',
      error: error.message
    });
  }
};

// Fetch prescription file from server
const getPrescriptionFile = async (req, res) => {
  try {
    // Accept both filePath and prescriptionFilePath for backward compatibility
    const filePath = req.body.filePath || req.body.prescriptionFilePath;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'File path is required. Please provide either filePath or prescriptionFilePath in the request body'
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found at the specified path',
        filePath: filePath
      });
    }

    // Get file details
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(fileName).toLowerCase();
    
    // Set appropriate content type based on file extension
    const contentType = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.pdf': 'application/pdf'
    }[fileExtension] || 'application/octet-stream';

    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming file',
          error: error.message
        });
      }
    });

  } catch (error) {
    console.error('Error in getPrescriptionFile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  addCartItem,
  getCartItemsById,
  deleteProductFromCart,
  getPrescriptionFile,
  deletePrescriptionFile,
  addContactLensToCart,
  getLocalCartData,
  addMultipleCartItems,
  updateCartQuantity,
  getCartItemCountById,
  addBlutoCart
};
