const db = require("../config/db");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

// Define the base upload directory from .env
const UPLOAD_DIR =
  process.env.FILE_UPLOAD_PATH ||
  path.join(__dirname, "/uploads/prescriptions");

// Check if UPLOAD_DIR is a URL or local path
const isUrl = UPLOAD_DIR.startsWith('http://') || UPLOAD_DIR.startsWith('https://');

// Only ensure directory exists if it's a local path
if (!isUrl) {
  // For local storage, ensure the base directory exists
  fs.ensureDirSync(UPLOAD_DIR);
}

// Function to check and create remote directories
async function ensureRemoteDirectoryExists(baseUrl, folderPath) {
  try {
    // Construct the full URL for the directory check/creation
    const url = new URL(baseUrl);
    
    // Ensure the path ends with a slash
    if (!url.pathname.endsWith('/')) {
      url.pathname += '/';
    }
    
    // Add the folder path
    if (folderPath) {
      url.pathname += folderPath;
      
      // Ensure the path ends with a slash again
      if (!url.pathname.endsWith('/')) {
        url.pathname += '/';
      }
    }
    
    // Make a request to check if the directory exists
    // This is a placeholder - you'll need to implement the actual check based on your server's API
    const checkResponse = await axios.get(url.toString(), {
      headers: {
        // Add any authentication headers if needed
      }
    });
    
    // If the directory doesn't exist, create it
    // This is a placeholder - you'll need to implement the actual creation based on your server's API
    if (checkResponse.status === 404) {
      const createResponse = await axios.post(url.toString(), {
        action: 'createDirectory'
      }, {
        headers: {
          // Add any authentication headers if needed
        }
      });
      
      console.log(`Created directory: ${url.toString()}`);
    }
    
    return url.toString();
  } catch (error) {
    console.error(`Error ensuring remote directory exists: ${error.message}`);
    throw error;
  }
}

// Configure multer storage based on whether we're using local or remote storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Get customer_id from the request body
    const customerId = req.body.customer_id;
    if (!customerId) {
      return cb(new Error("Customer ID is required"), null);
    }

    if (isUrl) {
      // For remote storage, we'll handle the actual upload after multer processes the file
      // For now, use a temporary directory
      const tempDir = path.join(__dirname, "../temp");
      fs.ensureDirSync(tempDir);
      cb(null, tempDir);
    } else {
      // For local storage, create directory with customer_id if it doesn't exist
      const prescriptionsDir = path.join(UPLOAD_DIR, "prescriptions");
      fs.ensureDirSync(prescriptionsDir);
      
      const customerDir = path.join(prescriptionsDir, customerId.toString());
      fs.ensureDirSync(customerDir);
      cb(null, customerDir);
    }
  },
  filename: function (req, file, cb) {
    // Create a unique filename with original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Initialize multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images and PDFs only
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only images and PDF files are allowed"), false);
    }
  },
});

// Function to upload file to remote server
async function uploadToRemoteServer(localFilePath, customerId, filename) {
  try {
    // Ensure the prescriptions directory exists on the remote server
    await ensureRemoteDirectoryExists(UPLOAD_DIR, 'prescriptions');
    
    // Ensure the customer directory exists on the remote server
    const remoteUrl = await ensureRemoteDirectoryExists(UPLOAD_DIR, `prescriptions/${customerId}`);
    
    // Create a form-data instance
    const formData = new FormData();
    
    // Read the file as a stream and append it to the form
    const fileStream = fs.createReadStream(localFilePath);
    formData.append('file', fileStream, filename);
    
    // Send the file to the remote server
    const response = await axios.post(remoteUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        // Add any authentication headers if needed
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    // Return the remote file URL
    return `${remoteUrl}${filename}`;
  } catch (error) {
    console.error('Error uploading to remote server:', error);
    throw new Error(`Failed to upload to remote server: ${error.message}`);
  }
}

const addPrescription = async (req, res) => {
   try {
        const { customer_id, prescription_name, prescription } = req.body;

        // Basic validation
        if (!customer_id || !prescription) {
            return res.status(400).json({
                success: false,
                message: 'customer_id and prescription are required'
            });
        }

        // Convert prescription to string if it's an object
        const prescriptionString = typeof prescription === 'object' 
            ? JSON.stringify(prescription) 
            : prescription;

        // Execute the insert query
        await db.query(
            `INSERT INTO prescriptions 
             (customer_id, prescription, prescription_name, created_at, updated_at)
             VALUES(?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [customer_id, prescriptionString, prescription_name || '']
        );

        res.status(200).json({
            success: true,
            message: 'Prescription added successfully'
        });

    } catch (error) {
        console.error('Error adding prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add prescription',
            error: error.message
        });
    }

};


const deletePrescription = async (req, res) => {
    try {
        const prescriptionId = req.params.id;

        if (!prescriptionId || isNaN(prescriptionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid prescription ID provided'
            });
        }

        const [result] = await db.query(
            'DELETE FROM prescriptions WHERE id = ?',
            [prescriptionId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prescription not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Prescription deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting prescription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete prescription',
            error: error.message
        });
    }
};


const getPrescription = async (req, res) => {
 try {
        const customerId = req.params.id;
        
        // Validate customerId
        if (!customerId || isNaN(customerId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer ID provided'
            });
        }

        // Execute the query
        const [prescriptions] = await db.query(
            'SELECT * FROM prescriptions WHERE customer_id = ?',
            [customerId]
        );

        // Check if any prescriptions were found
        if (prescriptions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No prescriptions found for this customer'
            });
        }

        // Return the prescriptions
        res.status(200).json({
            success: true,
            data: prescriptions
        });

    } catch (error) {
        console.error('Error fetching prescriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch prescriptions',
            error: error.message
        });
    }
};



// Upload prescription file
const uploadPrescriptionFile = async (req, res) => {
  try {
    // The file is already saved by multer middleware
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Get customer_id from request body - ensure consistency in parameter naming
    const customerId = req.body.customer_id;
    if (!customerId) {
      // Remove the uploaded file if customer_id is missing
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    let filePath = req.file.path;
    let fileUrl = filePath;

    // If we're using a remote URL, upload the file to the remote server
    if (isUrl) {
      try {
        fileUrl = await uploadToRemoteServer(req.file.path, customerId, req.file.filename);
        
        // Optionally delete the local temp file after successful upload
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error('Error in remote upload:', uploadError);
        return res.status(500).json({
          success: false,
          message: "Error uploading file to remote server",
          error: uploadError.message
        });
      }
    }

    // Save file information to database if needed
    // This is optional - you can create a table to track uploaded files
    // const fileData = {
    //   customer_id: customerId,
    //   file_path: fileUrl,
    //   file_name: req.file.filename,
    //   file_type: req.file.mimetype,
    //   file_size: req.file.size
    // };
    // Save fileData to database...

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        filename: req.file.filename,
        path: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error("Error in uploadPrescriptionFile:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: error.message || error,
    });
  }
};

// Middleware for handling file upload - MATCH THE FIELD NAME FROM FRONTEND
const uploadMiddleware = upload.single("file");

module.exports = { addPrescription,getPrescription,deletePrescription, uploadPrescriptionFile, uploadMiddleware };
