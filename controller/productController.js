const db = require("../config/db");



const addRatings = async (req, res) => {
    try {
        const { product_id, customer_id, rating, review } = req.body;

        // Input validation
        if (!product_id || !customer_id) {
            console.log("Validation failed:", req.body);
            return res.status(400).json({
                success: false,
                message: "Required fields are missing: product_id, customer_id, rating_value, reviewtext",
            });
        }

        const sqlQuery = `
            INSERT INTO productrating (
                productID, userID,  ratingValue, reviewText
            ) VALUES (?, ?, ?, ?)
        `;

        const values = [product_id, customer_id, rating, review];

        console.log("Executing query...");
        const result = await db.query(sqlQuery, values); 

        console.log("Query successful:", result);

        res.status(201).json({
            success: true,
            message: "Rating added successfully",
            // wishlistItemId: result.insertId,
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



const updateRating = async (req, res) => {
    try {
        const { product_id, customer_id, rating, review } = req.body;

        // Input validation
        if (!product_id || !customer_id) {
            console.log("Validation failed:", req.body);
            return res.status(400).json({
                success: false,
                message: "Required fields are missing: product_id, customer_id, rating_value, reviewtext",
            });
        }

        const sqlQuery = `
            UPDATE productrating
            SET ratingValue = ?, reviewText = ?
            WHERE productID = ? AND userID = ?
        `;

        const values = [rating, review, product_id, customer_id];

        console.log("Executing update query...");
        const result = await db.query(sqlQuery, values);

        console.log("Update successful:", result);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "No matching rating found to update",
            });
        }

        res.status(200).json({
            success: true,
            message: "Rating updated successfully",
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





const gatAllBundelOffers = async (req, res) =>{
  try{
    const data = await db.query("select * from bundle_offer")
    try{
      if(!data){
        res.status(404).send({
          success:false,
          message:"No records found",
        })
      }else{
        res.status(200).send({
          success:true,
          message:"Records fetched",
          data:data[0],
        }
        )
      }
    }catch(e){
      res.status(400).send({
        success:false,
        message:e.message,
      })
    }
  } catch(e){
    res.status(400).send({
      success:false,
      message:e.message,
    })
  }
}

// Get all Products
const getAllProducts = async (req, res) => {
  try {
    const data = await db.query("SELECT * FROM getproducts where pr_status='1' order by pr_id desc");
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

const getAllMaterial = async (req, res) => {
  try {
    const data = await db.query(
  "SELECT DISTINCT pr_material FROM sg_product sp WHERE pr_material IS NOT NULL AND pr_material != ''"
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

const getAllShape = async (req, res) => {
  try {
    // Get distinct shapes
    const shapes = await db.query(
      "SELECT DISTINCT shape FROM sg_product sp WHERE shape IS NOT NULL AND ca_id IN (2,10);"
    );

    // Get distinct frame sizes
    const frameSizes = await db.query(
      "SELECT DISTINCT frame_size FROM sg_product sp WHERE frame_size IS NOT NULL AND ca_id IN (2,10);"
    );

    // Get distinct frame styles
    const frameStyles = await db.query(
      "SELECT DISTINCT frame_style FROM sg_product sp WHERE frame_style IS NOT NULL AND ca_id IN (2,10);"
    );

    if (!shapes || !frameSizes || !frameStyles) {
      return res.status(404).send({
        success: false,
        message: "No records found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Records fetched",
      data: {
        shapes: shapes[0],
        frameSizes: frameSizes[0],
        frameStyles: frameStyles[0]
      },
      totalRecords: {
        shapes: shapes[0].length,
        frameSizes: frameSizes[0].length,
        frameStyles: frameStyles[0].length
      },
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};


// Get Product by ID
const getProductById = async (req, res) => {
  try {
    // Extract productId and categoryId from query parameters
    const { productId, categoryId } = req.params;
    // Validate productId and categoryId
    if (!productId || !categoryId || isNaN(productId) || isNaN(categoryId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid product ID or category ID",
        data: [],
        totalRecords: 0,
        similarProducts: [],
      });
    }

    // Fetch data based on categoryId
    let queryResult;
    if (Number(categoryId) === 3) {
      // Query for contact lens products
      queryResult = await db.query(
        `SELECT * FROM sg_contactlens WHERE id = ?`,
        [productId]
      );
    } else {
      // Query for other products
      queryResult = await db.query(
        `SELECT * FROM complete_product_details 
           WHERE parent_product_id IN (
             SELECT parent_product_id FROM sg_product 
             WHERE pr_id = ?
           ) and ca_id = ?`,
        [productId, categoryId]
      );
    }

    // Extract rows from the query result
    const rows = queryResult[0];
    if (!rows || rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No records found",
        data: [],
        totalRecords: 0,
        similarProducts: categoryId !== 3 ? [] : undefined, // Include similarProducts only if categoryId is not 3
      });
    }

    if (Number(categoryId) === 3) {
      // For categoryId 3, return the single record
      return res.status(200).send({
        success: true,
        message: "Record fetched",
        data: rows, // Wrap result in an array
        totalRecords: 1,
      });
    }

    // For other categories, find the requested product and similar products
    const requestedProduct = rows.find(
      (product) => Number(product.pr_id) === Number(productId)
    );
    if (!requestedProduct) {
      return res.status(404).send({
        success: false,
        message: "Requested product not found",
        data: [],
        totalRecords: 0,
        similarProducts: [],
      });
    }

    const similarProducts = rows.map((product) => ({
      pr_id: product.pr_id,
      slug: product.slug,
    }));

    // Send the response
    return res.status(200).send({
      success: true,
      message: "Records fetched",
      data: [requestedProduct],
      totalRecords: 1,
      similarProducts,
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Add Product
const addProduct = async (req, res) => {
  try {
    const {
      br_id,
      bd_id,
      ca_id,
      sg_gender_ids,
      parent_product_id,
      pr_name,
      slug,
      pr_sku,
      pr_qty,
      pr_description,
      pr_dprice,
      pr_sprice,
      pr_price,
      pr_image,
      selected_image_to_show,
      psd_files,
      platform,
      pr_a_size,
      pr_b_size,
      pr_d_size,
      lens_type_ids,
      pr_status,
      pr_created_by,
    } = req.body;

    const query = `
            INSERT INTO sg_product (
                br_id, bd_id, ca_id, sg_gender_ids, parent_product_id, pr_name, slug, 
                pr_sku, pr_qty, pr_description, pr_dprice, pr_sprice, pr_price, 
                pr_image, selected_image_to_show, psd_files, platform, pr_a_size, 
                pr_b_size, pr_d_size, lens_type_ids, pr_status, pr_created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const values = [
      br_id,
      bd_id,
      ca_id,
      sg_gender_ids,
      parent_product_id,
      pr_name,
      slug,
      pr_sku,
      pr_qty,
      pr_description,
      pr_dprice,
      pr_sprice,
      pr_price,
      pr_image,
      selected_image_to_show,
      psd_files,
      platform,
      pr_a_size,
      pr_b_size,
      pr_d_size,
      lens_type_ids,
      pr_status || "1", // Default status to '1' if not provided
      pr_created_by,
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error("Error inserting data: ", err);
        res.status(500).json({ error: "Failed to insert data" });
      } else {
        res
          .status(201)
          .json({ message: "Product added successfully", id: result.insertId });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error in getAllProducts",
      error,
    });
  }
};

// Get Products by Dynamic Query (new method)
const getProductsByDynamicQuery = async (req, res) => {
  const { table, filters, limit, offset } = req.body;

  // Validate the request body
  if (!table || !filters || !Array.isArray(filters)) {
    return res
      .status(400)
      .json({ error: "Invalid request. Table and filters are required." });
  }

  // Start building the query
  let query = `SELECT * FROM ??`;
  let queryParams = [table];

  // Handle filters dynamically
  if (filters.length > 0) {
    const whereClauses = filters.map((filter) => `?? = ?`).join(" AND ");
    query += ` WHERE ${whereClauses} AND pr_status = '1'`;
    filters.forEach((filter) => {
      queryParams.push(filter.key);
      queryParams.push(filter.value);
    });
  } else {
    // If no other filters, just add pr_status condition
    query += ` WHERE pr_status = '1'`;
  }
  

  // Handle pagination (limit and offset)
  if (limit) {
    query += ` LIMIT ?`;
    queryParams.push(limit);
  }

  if (offset) {
    query += ` OFFSET ?`;
    queryParams.push(offset);
  }

  // Execute query
  try {
    const [results] = await db.query(query, queryParams);

    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No records found" });
    }

    // Group products by parent_product_name if the key exists
    const groupedResults = [];
    const groupedMap = new Map();

    results.forEach((product) => {
      const parentName = product.parent_product_name;

      // Check if parent_product_name exists in the product
      if (parentName) {
        // If the parent name doesn't exist in the map, initialize it
        if (!groupedMap.has(parentName)) {
          groupedMap.set(parentName, {
            ...product, // Spread the first product data
            relatedProducts: [], // Initialize the relatedProducts array
          });
        }

        // Push the current product into relatedProducts
        const groupedProduct = groupedMap.get(parentName);
        groupedProduct.relatedProducts.push(product);
      } else {
        // If parent_product_name doesn't exist, just add the product as a standalone
        groupedResults.push(product);
      }
    });

    // Convert the groupedMap to an array of grouped results
    groupedResults.push(...groupedMap.values());

    res.status(200).json({
      success: true,
      message: "Records fetched",
      data: groupedResults,
      totalRecords: groupedResults.length,
    });
  } catch (error) {
    console.error("Error executing dynamic query: ", error);
    res.status(500).json({ error: "Error executing query" });
  }
};

const getWishlistStatusById = async (req, res) => {
  try {
    const { productId, customerId } = req.query; // Access query parameters

    if (!productId || !customerId) {
      return res.status(400).send({
        success: false,
        message: "Product ID and Customer ID are required",
      });
    }

    const data = await db.query(
      "SELECT is_active FROM sg_wishlist WHERE product_id = ? AND customer_id = ?",
      [productId, customerId]
    );
    console.log("wishlist status", data);
    if (data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No records found",
      });
    } else {
      res.status(200).send({
        success: true,
        message: "Records fetched",
        data: data[0],
        totalRecords: data.length, // Corrected totalRecords
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

// Get Products by categoryID
const getSimilarProductsByCategory = async (req, res) => {
  try {
    const { ca_id, pr_id } = req.query; // Access query parameters
    let data;
    console.log(ca_id);
    if (ca_id != 3) {
      data = await db.query(
        "SELECT * FROM getproducts WHERE ca_id = ? and pr_status='1' and pr_id != ? limit 20",
        [ca_id, pr_id]
      );
    } else {
      data = await db.query(
        "SELECT * FROM getallcontactlens WHERE ca_id = ? and status='1' and id != ? limit 20",
        [ca_id, pr_id]
      );
    }
    // Query the database

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
    console.error("Error:", error); // Debugging
    res.status(400).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

const searchProduct = async (req, res) => {
  try {
    const { searchString } = req.body;

    if (!searchString || typeof searchString !== "string") {
      return res.status(400).send({
        success: false,
        message: "Search string is required and must be a string",
      });
    }

    // Normalize input
    let cleanedSearch = searchString.toLowerCase().trim();

    // Split around "for" to extract gender if present
    const [productPart, genderPartRaw] = cleanedSearch.split(" for ");
    const productKeywords = productPart.trim();
    const genderKeywords = genderPartRaw ? genderPartRaw.trim() : null;

    // Category mapping for better matching
    const getCategoryPattern = (searchTerm) => {
      const term = searchTerm.toLowerCase();
      
      // Direct category matches
      if (term.includes('sunglass') || term.includes('sun glass')) return '%sunglass%';
      if (term.includes('eyeglass') || term.includes('eye glass') || term === 'glasses') return '%eyeglass%';
      
      // Map all lens-related searches to contact lens
      if (term.includes('lens') || term.includes('contact')) return '%contact lens%';
      
      if (term.includes('accessories') || term.includes('accessory')) return '%accessories%';
      if (term.includes('genie') || term.includes('blu')) return '%genie blu%';
      
      return `%${term}%`;
    };

    // Gender mapping with precise matching
    const getGenderCondition = (genderTerm) => {
      if (!genderTerm) return null;
      
      const term = genderTerm.toLowerCase();
      if (term.includes('women') || term.includes('woman') || term.includes('female')) {
        return {
          condition: `LOWER(p.gender_names) LIKE '%women%'`,
          params: []
        };
      }
      if (term.includes('men') || term.includes('man') || term.includes('male')) {
        return {
          condition: `(LOWER(p.gender_names) LIKE '%men%' AND LOWER(p.gender_names) NOT LIKE '%women%')`,
          params: []
        };
      }
      if (term.includes('kids') || term.includes('kid') || term.includes('children') || term.includes('child')) {
        return {
          condition: `LOWER(p.gender_names) LIKE '%kids%'`,
          params: []
        };
      }
      
      return {
        condition: `LOWER(p.gender_names) LIKE ?`,
        params: [`%${term}%`]
      };
    };

    const categoryPattern = getCategoryPattern(productKeywords);
    const genderCondition = getGenderCondition(genderKeywords);

    // Build query for getallproduct
    let productQuery = `
      SELECT 
        p.pr_price AS pr_price,
        p.pr_id AS pr_id,
        p.pr_status AS pr_status,
        p.pr_sprice AS pr_sprice,
        p.pr_image_json AS pr_image_json,
        p.parent_product_name AS pr_name,
        p.ca_id AS ca_id
      FROM getallproduct p
      WHERE p.pr_status = '1'`;

    const productParams = [];

    // Add category/product search conditions
    productQuery += ` AND (
        LOWER(p.parent_product_name) LIKE ? OR
        LOWER(p.parent_product_description) LIKE ? OR
        LOWER(p.ca_name) LIKE ?
      )`;
    
    productParams.push(categoryPattern, categoryPattern, categoryPattern);

    // Add gender filter if present
    if (genderCondition) {
      productQuery += ` AND ${genderCondition.condition}`;
      productParams.push(...genderCondition.params);
    }

    // Add exclusion logic for specific searches
    const searchLower = productKeywords.toLowerCase();
    if (searchLower.includes('eyeglass') || (searchLower === 'glasses' && !searchLower.includes('sun'))) {
      // If searching for eyeglasses, exclude sunglasses
      productQuery += ` AND LOWER(p.ca_name) NOT LIKE '%sunglass%'`;
    } else if (searchLower.includes('sunglass') || searchLower.includes('sun glass')) {
      // If searching for sunglasses, only include sunglasses
      productQuery += ` AND LOWER(p.ca_name) LIKE '%sunglass%'`;
    }

    // Build query for getalllens (no gender filtering here)
    let lensQuery = `
      SELECT 
        cl.pr_id AS pr_id,
        cl.pr_price AS pr_price,
        cl.pr_sprice AS pr_sprice,
        cl.pr_image_json AS pr_image_json,
        cl.pr_name AS pr_name,
        cl.ca_id AS ca_id,
        cl.pr_status AS status
      FROM getalllens cl
      WHERE cl.pr_status = '1' AND (
        LOWER(cl.pr_name) LIKE ? OR
        LOWER(cl.pr_description) LIKE ? OR
        LOWER(cl.ca_name) LIKE ?
      )`;

    const lensParams = [categoryPattern, categoryPattern, categoryPattern];

    // Add specific lens category filtering - always map to contact lens
    if (searchLower.includes('lens') || searchLower.includes('contact')) {
      lensQuery += ` AND LOWER(cl.ca_name) LIKE '%contact lens%'`;
    }

    // Execute queries
    const [productResults] = await db.query(productQuery, productParams);
    const [lensResults] = await db.query(lensQuery, lensParams);

    // Filter lens results by gender if specified (since getalllens doesn't have gender)
    // This is optional - you might want to include all lens results regardless of gender
    let filteredLensResults = lensResults;
    if (genderKeywords && lensResults.length > 0) {
      // You can either exclude lens results when gender is specified,
      // or include them all. Uncomment the line below to exclude them:
      // filteredLensResults = [];
    }

    const mergedResults = [...productResults, ...filteredLensResults];

    if (mergedResults.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No matching products found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Products fetched successfully",
      data: mergedResults,
      totalRecords: mergedResults.length,
    });
  } catch (error) {
    console.error("Error in searchProduct:", error);
    return res.status(500).send({
      success: false,
      message: "Something went wrong",
      error: error.message || error,
    });
  }
};

const parseSearch = (searchString) => {
  const lower = searchString.toLowerCase();
  const parts = lower.split(/\s+for\s+/);  // split at "for"
  return {
    productQuery: parts[0]?.trim() || '',
    genderQuery: parts[1]?.trim() || '',
  };
};



const getLocalData = async (req, res) => {
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
          `SELECT * FROM wishlist_temp_lens WHERE product_id = ?`,
          [product_id]
        );
      } else {
        // Query for other categories
        queryResult = await db.query(
          `SELECT * FROM wishlist_temp_products WHERE product_id = ?`,
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

const getBrands = async (req, res) => {
  try {
    // Get categoryId from path parameter instead of query parameter
    const categoryId = req.params.id;
    console.log(categoryId);
    console.log(req);

    let query =
      "SELECT bd_id, bd_name, bd_description, db_image, db_status, db_created_by, db_created_date, ca_id FROM sg_brand";
    let queryParams = [];

    // If categoryId is provided, add the LIKE condition to filter brands
    if (categoryId) {
      // This will match if categoryId is the only value or part of a comma-separated list
      query +=
        " WHERE ca_id = ? OR ca_id LIKE ? OR ca_id LIKE ? OR ca_id LIKE ?";

        console.log('categoryid',query)
      queryParams = [
        categoryId, // Exact match
        `${categoryId},%`, // At the beginning
        `%,${categoryId},%`, // In the middle
        `%,${categoryId}`, // At the end
      ];
              console.log('categoryid',query)

    }

    console.log(query, queryParams)

    const [brands] = await db.query(query, queryParams);

    if (!brands || brands.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No brands found",
        data: [],
        totalRecords: 0,
      });
    }

    return res.status(200).send({
      success: true,
      message: "Brands fetched successfully",
      data: brands,
      totalRecords: brands.length,
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


const checkRating = async (req, res) => {
    try {
        const productId = req.params.productId;
        const customerId = req.params.customerId;
        console.log(req.body)

        // Input validation
        if (!productId || !customerId) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing: product_id, customer_id",
            });
        }

        const sqlQuery = `
            SELECT ratingValue, reviewText
            FROM productrating
            WHERE productID = ? AND UserID = ?
        `;

        const values = [productId, customerId];

        const [rows] = await db.query(sqlQuery, values);

        if (rows.length > 0) {
            return res.status(200).json({
                success: true,
                message: "Rating found",
                data: rows[0],
            });
        } else {
            return res.status(200).json({
                success: false,
                message: "No rating found for this user and product",
            });
        }
    } catch (error) {
        console.error("Error checking rating:", error);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred",
            error: error.message,
        });
    }
};


module.exports = {
  searchProduct,
  getAllProducts,
  getAllMaterial,
  checkRating,
  getAllShape,
  getProductById,
  addProduct,
  getProductsByDynamicQuery,
  getWishlistStatusById,
  getSimilarProductsByCategory,
  getLocalData,
  gatAllBundelOffers,
  addRatings,
  updateRating,
  getBrands, // Add the new function to exports
};