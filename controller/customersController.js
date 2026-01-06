const db = require("../config/db");
const axios = require('axios');
const path = require('path'); // Import the path module
const mime = require('mime-types'); // Import mime-types for MIME type detection
const crypto = require('crypto');

//Get all Customers
const getAllCustomers = async (req,res) => {
    try {
        const data = await db.query("SELECT * FROM sg_customer");
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

//Get Customer by ID
const getCustomerById = async (req,res) => {
    try {
        const customerId = req.params.id;
        const data = await db.query("SELECT * FROM sg_customer WHERE cu_id = ?",[customerId] );
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

//Add user
const addNewCustomer = async (req, res) => {
    try {
        const {
            name,
            mobile,
            email,
            referral_code,
            is_google_user,
            google_profile_id,
            referred_by,
            wallet
        } = req.body;

        if (!name || !mobile || !email) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing: name, mobile, email",
            });
        }

        // Initialize wallet value
        let walletAmount = wallet || 0;
        // If referred_by exists, add 50 to wallet
        if (referred_by) {
            let referral_status = await getCustomerByReferralCode(referred_by); // Await for the Promise to resolve
            console.log("referral_status", referral_status);
            
            if (referral_status !== "No records found") {
                walletAmount += 50;
                const referrerId = referral_status[0].id;
                addReferralPoints(referrerId);
            }
        }

       let generated_code = generateUniqueCode();
        const sqlQuery = `
            INSERT INTO sg_customer_online(
                name, mobile, email, referral_code, is_google_user, google_profile_id, referred_by, wallet
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            name,
            mobile,
            email,
            generated_code || null,
            is_google_user || null,
            google_profile_id || null,
            referred_by || null,
            walletAmount
        ];

        const result = await db.query(sqlQuery, values); // Directly use db.query without promisify

        res.status(201).json({
            success: true,
            message: "Customer added successfully",
            customerId: result.insertId,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred",
            error: error.message,
        });
    }
};


const editCustomer = async (req, res) => {
    try {
        console.log("Start of function");
        const {
            name,
            mobile,
            email,
            id
        } = req.body;

        const sqlQuery = `
            UPDATE sg_customer_online 
            SET name = ?, mobile = ?, email = ? 
            WHERE id = ?
        `;

        const values = [
            name,
            mobile,
            email,
            id
        ];

        console.log("Executing query...");
        const result = await db.query(sqlQuery, values);  // Directly use db.query without promisify

        console.log("Query successful:", result);

        res.status(200).json({
            success: true,
            message: "Customer updated successfully",
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




const updateReferalForNewUSer = async (req, res) => {
    try {
        console.log("Start of function");
        const {
            id,
            wallet,
            referred_by
        } = req.body;

        const sqlQuery = `
            UPDATE sg_customer_online 
            SET wallet = ?, referred_by = ? 
            WHERE id = ?
        `;

        const values = [
            wallet,
            referred_by,
            id
        ];

        console.log("Executing query..." + sqlQuery);
        const result = await db.query(sqlQuery, values);  // Directly use db.query without promisify

        console.log("Query successful:", result);

        res.status(200).json({
            success: true,
            message: "Customer updated successfully",
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



const updateReferalForExistingUSer = async (req, res) => {
    try {
        console.log("Start of function");
        const {
            id
        } = req.body;
        
        const sqlQuery = `
           update sg_customer_online set wallet = wallet + 50 where id = ?
        `;

        const values = [
            id       ];

        console.log("Executing query..." + sqlQuery);
        const result = await db.query(sqlQuery, values);  // Directly use db.query without promisify

        console.log("Query successful:", result);

        res.status(200).json({
            success: true,
            message: "Customer updated successfully",
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


//Get Addresses by ID
const getCustomerAddresses = async (req,res) => {
    try {
        const customerId = req.params.id;
        const data = await db.query("SELECT * FROM sg_customer_address WHERE customer_id = ?",[customerId] );
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


const fetchFile = async(req, res) => {
    const { url } = req.query;
  
      if (!url) {
          return res.status(400).json({ error: 'URL is required' });
      }
  
 
      try {
        console.log('Fetching URL:', url); // Log the URL
        const response = await axios.get(url, { responseType: 'arraybuffer' });

        const fileExtension = path.extname(url).substring(1);
        const mimeType = mime.lookup(fileExtension) || 'application/octet-stream';
        const base64Data = Buffer.from(response.data, 'binary').toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        res.json({ data: dataUrl });
    } catch (error) {
        console.error('Error fetching the file:', error.response?.status, error.response?.data || error.message);
        res.status(500).json({ error: `Failed to fetch the file: ${error.message}` });
    }
}

function generateUniqueCode(length = 5) {
    // Prefix for the code
    const prefix = 'SG-';

    // Get the current timestamp in milliseconds
    const timestamp = Date.now().toString(36); // Base-36 encoding of the timestamp

    // Generate random characters
    const randomBytes = crypto.randomBytes(Math.ceil(length / 2)); // Generate sufficient random bytes
    const randomChars = randomBytes.toString('hex').slice(0, length); // Convert to hex and trim to desired length

    // Combine prefix, timestamp, and random characters
    return `${prefix}${timestamp}-${randomChars}`;
}

const getCustomerByReferralCode = async (referralCode) => {
    try {
        const data = await db.query("select id from sg_customer_online where referral_code = ?", [referralCode]);
        
        // Extract the actual query result
        const result = data[0];
        console.log("result from db",result)
        if (!result || result.length === 0) {
            return "No records found";
        } else {
            return result; // Returning the extracted result
        }
    } catch (error) {
        console.log(error);
        // Assuming this is part of an Express.js app, but res is not defined in this function. Fixing it:
        return {
            success: false,
            message: "Something went wrong",
            error,
        };
    }
};

const addReferralPoints = async (customerId) => {
    try {
        const data = await db.query("update sg_customer_online set wallet = wallet + 50 where id = ?", [customerId]);
        
        // Extract the actual query result
        const result = data[0];
        console.log("result from db",result)
        if (!result || result.length === 0) {
            return "No records found";
        } else {
            return result; // Returning the extracted result
        }
    } catch (error) {
        console.log(error);
        // Assuming this is part of an Express.js app, but res is not defined in this function. Fixing it:
        return {
            success: false,
            message: "Something went wrong",
            error,
        };
    }
};


module.exports = {updateReferalForNewUSer, updateReferalForExistingUSer,getAllCustomers , getCustomerById, getCustomerAddresses, addNewCustomer, editCustomer, fetchFile};