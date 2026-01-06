const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const db = require("../config/db");
require("dotenv").config();

// Router object
const router = express.Router();
const app = express();
const authenticateToken = require("../middleware/authentiactToken");
const { addTransactionDetails } = require("../controller/transaction");

app.use(express.json());
app.use(cors());
// / Merchant-specific configurations
const MERCHANT_KEY = "2410f881-f399-490a-9a01-f0547f568eea";
const MERCHANT_ID = "SPECTSGENIEONLINE";

// const MERCHANT_KEY = "14fa5465-f8a7-443f-8477-f986b8fcfde9";
// const MERCHANT_ID = "PGTESTPAYUAT77";

const BASE_URL = "https://apiv2.shiprocket.in/v1/external";

// Sandbox URLs
const MERCHANT_BASE_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";
const MERCHANT_STATUS_URL = "https://api.phonepe.com/apis/hermes/pg/v1/status";

// const MERCHANT_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
// const MERCHANT_STATUS_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status";

// Redirect URLs
const redirectUrl = "https://spectsgenie.com/api/api/phonepe/status";
const successUrl = "https://spectsgenie.com/payment-success";
const failureUrl = "https://spectsgenie.com/payment-failure";

// const redirectUrl = "http://localhost:8080/api/phonepe/status";
// const successUrl = "http://localhost:3000/payment-success";
// const failureUrl = "http://localhost:3000/payment-failure";
// Global paymentPayload
let paymentPayload = {};
let orderIds = "";
let orderPayAmount = 0;

// ========== UTILITY FUNCTIONS ==========

function generateOrderId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function generateCode(customerId) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const baseCode = 'SG-GOLD-200';
  return `${baseCode}${day}${month}${customerId}`;
}

// Function to fetch address from database
async function getAddressFromDatabase(addressId, customerId) {
  try {
    const [addressData] = await db.query(
      `SELECT * FROM sg_customer_address 
       WHERE id = ? AND customer_id = ?`,
      [addressId, customerId]
    );
    
    if (addressData.length === 0) {
      throw new Error(`Address not found for ID: ${addressId} and Customer: ${customerId}`);
    }
    
    return addressData[0];
  } catch (error) {
    console.error("Error fetching address from database:", error.message);
    throw error;
  }
}

// ========== ENHANCED ADMIN NOTIFICATION FUNCTION ==========
const sendAdminAlert = async (alertData) => {

  try {
    const {
      severity = "ERROR", // ERROR, CRITICAL, WARNING, INFO
      title,
      error,
      context = {},
      stackTrace = null
    } = alertData;

    // Determine emoji based on severity
    const severityEmoji = {
      CRITICAL: "🚨🚨🚨",
      ERROR: "❌",
      WARNING: "⚠️",
      INFO: "ℹ️"
    };

    // Build comprehensive alert message
    let message = `${severityEmoji[severity]} *${severity}: ${title}*\n`;
    message += `\n⏰ *Time:* ${getCurrentDateTime()}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Add error details
    if (error) {
      message += `🔴 *Error Details:*\n`;
      message += `Message: ${error.message || error}\n`;
      if (error.code) message += `Code: ${error.code}\n`;
      if (error.response?.status) message += `HTTP Status: ${error.response.status}\n`;
      if (error.response?.data) {
        message += `Response: ${JSON.stringify(error.response.data).substring(0, 200)}...\n`;
      }
      message += `\n`;
    }

    // Add context information
    if (Object.keys(context).length > 0) {
      message += `📋 *Context Information:*\n`;
      
      if (context.orderId) message += `Order ID: ${context.orderId}\n`;
      if (context.transactionId) message += `Transaction ID: ${context.transactionId}\n`;
      if (context.customerId) message += `Customer ID: ${context.customerId}\n`;
      if (context.customerName) message += `Customer: ${context.customerName}\n`;
      if (context.customerPhone) message += `Phone: ${context.customerPhone}\n`;
      if (context.customerEmail) message += `Email: ${context.customerEmail}\n`;
      if (context.amount) message += `Amount: ₹${context.amount}\n`;
      if (context.paymentStatus) message += `Payment Status: ${context.paymentStatus}\n`;
      if (context.orderStatus) message += `Order Status: ${context.orderStatus}\n`;
      if (context.step) message += `Failed at Step: ${context.step}\n`;
      if (context.operation) message += `Operation: ${context.operation}\n`;
      
      // Add any additional context
      Object.keys(context).forEach(key => {
        if (!['orderId', 'transactionId', 'customerId', 'customerName', 
              'customerPhone', 'customerEmail', 'amount', 'paymentStatus', 
              'orderStatus', 'step', 'operation'].includes(key)) {
          message += `${key}: ${JSON.stringify(context[key]).substring(0, 100)}\n`;
        }
      });
      message += `\n`;
    }

    // Add stack trace for critical errors
    if (stackTrace && severity === "CRITICAL") {
      message += `📚 *Stack Trace:*\n`;
      message += `\`\`\`${stackTrace.substring(0, 500)}...\`\`\`\n\n`;
    }

    // Add action required
    message += `🔧 *Action Required:*\n`;
    switch(severity) {
      case "CRITICAL":
        message += `⚡ IMMEDIATE ACTION REQUIRED!\n`;
        message += `This is a critical failure that requires immediate attention.\n`;
        if (context.orderId && context.amount) {
          message += `Customer paid ₹${context.amount} but order may not be processed.\n`;
        }
        break;
      case "ERROR":
        message += `Please investigate and take necessary action.\n`;
        break;
      case "WARNING":
        message += `Please review when possible.\n`;
        break;
      default:
        message += `For your information.\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━`;

    // Send to admin
    if (!process.env.PHONE_NUMBER) {
      console.error("⚠️ Admin phone number not configured. Alert not sent:");
      console.error(message);
      return { success: false, reason: "Admin phone not configured" };
    }

    const result = await sendWhatsAppMessage(process.env.PHONE_NUMBER, message);
    
    if (result.success) {
      console.log(`✅ Admin alert sent successfully: ${title}`);
    } else {
      console.error(`❌ Failed to send admin alert: ${title}`);
      console.error("Alert failure reason:", result.error);
    }

    return result;

  } catch (alertError) {
    console.error("❌ Critical: Failed to send admin alert:", alertError.message);
    console.error("Original alert data:", alertData);
    return { success: false, error: alertError.message };
  }
};

// Function to get Access Token
const getAccessToken = async () => {
  try {
    if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
      throw new Error("Shiprocket credentials not configured");
    }

    const data = {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    };

    const response = await axios.post(`${BASE_URL}/auth/login`, data, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    });

    if (!response.data || !response.data.token) {
      throw new Error("Invalid token response from Shiprocket");
    }

    return response.data.token;
  } catch (error) {
    console.error("Error fetching Shiprocket token:", error.response?.data || error.message);
    
    // Send admin alert
    await sendAdminAlert({
      severity: "ERROR",
      title: "Shiprocket Token Fetch Failed",
      error: error,
      context: {
        operation: "Get Shiprocket Access Token",
        email: process.env.SHIPROCKET_EMAIL
      }
    });
    
    throw new Error(`Failed to fetch Shiprocket token: ${error.message}`);
  }
};

const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    console.log(message)
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    if (!process.env.INSTANCE_ID) {
      throw new Error("INSTANCE_ID not configured in .env");
    }
    
    if (!process.env.WHATSAPP_ACCESS_TOKEN) {
      throw new Error("WHATSAPP_ACCESS_TOKEN not configured in .env");
    }

    const formattedPhoneNumber = `91${phoneNumber}`;
    const url = "https://cloud.textonitsolutions.com/api/send";
    const params = {
      number: formattedPhoneNumber,
      type: "text",
      message: message,
      instance_id: process.env.INSTANCE_ID,
      access_token: process.env.WHATSAPP_ACCESS_TOKEN,
    };

    console.log(`📤 Attempting to send WhatsApp to ${formattedPhoneNumber}...`);
    
    const response = await axios.get(url, { 
      params,
      timeout: 10000 
    });

    console.log(`📥 WhatsApp API Response for ${formattedPhoneNumber}:`, response.data);

    if (response.data.status === "success") {
      console.log(`✅ WhatsApp message sent successfully to ${formattedPhoneNumber}`);
      return { success: true, phone: formattedPhoneNumber };
    } else {
      console.error(`❌ WhatsApp message failed to send to ${formattedPhoneNumber}:`, response.data);
      return { success: false, phone: formattedPhoneNumber, error: response.data };
    }
  } catch (error) {
    console.error(`❌ WhatsApp Error for ${phoneNumber}:`, error.response?.data || error.message);
    return { success: false, error: error.message, details: error.response?.data };
  }
};

function formatPrescriptionTable(prescriptionJson) {
  try {
    const prescription = typeof prescriptionJson === 'string'
      ? JSON.parse(prescriptionJson)
      : prescriptionJson;

    let table = "*📋 PRESCRIPTION DETAILS*\n";
    table += "```-------------------------------\n";
    table += "| EYE  |  SPH  |  CYL  | AXIS | ADD  |\n";
    table += "-------------------------------\n";
    table += `| RIGHT| ${String(prescription.right?.sph ?? '0.00').padEnd(6)}| ${String(prescription.right?.cyl ?? '0.00').padEnd(6)}| ${String(prescription.right?.axis ?? '0.00').padEnd(5)}| ${String(prescription.right?.add ?? '0.00').padEnd(5)}|\n`;
    table += `| LEFT | ${String(prescription.left?.sph ?? '0.00').padEnd(6)}| ${String(prescription.left?.cyl ?? '0.00').padEnd(6)}| ${String(prescription.left?.axis ?? '0.00').padEnd(5)}| ${String(prescription.left?.add ?? '0.00').padEnd(5)}|\n`;
    table += "-------------------------------```\n";

    table += "*👁️ PUPILLARY DISTANCE (PD)*\n";
    if (prescription.hasTwoPd === "1" || prescription.hasTwoPd === 1) {
      table += `Right PD: ${prescription.rightPD || 'Not specified'}\n`;
      table += `Left PD: ${prescription.leftPD || 'Not specified'}\n`;
    } else {
      table += `Single PD: ${prescription.pd || 'Not specified'}\n`;
    }
    return table;
  } catch (error) {
    console.error("Error formatting prescription:", error);
    return "Prescription data not available";
  }
}

// ========== ROUTE HANDLERS ==========

// Endpoint to create payment order
router.post("/create-order", async (req, res) => {
  const requestStartTime = Date.now();
  
  try {
    console.log("📥 Received create-order request");

    // Validate required fields (removed 'address' from required fields)
    const requiredFields = ['name', 'mobileNumber', 'amount', 'orderData', 'addressId', 'userId'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.error("❌ Missing required fields:", missingFields);
      
      await sendAdminAlert({
        severity: "WARNING",
        title: "Payment Order Creation Failed - Missing Fields",
        error: new Error("Missing required fields"),
        context: {
          missingFields: missingFields.join(', '),
          customerName: req.body.name,
          customerPhone: req.body.mobileNumber,
          requestBody: JSON.stringify(req.body).substring(0, 300)
        }
      });
      
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields", 
        missingFields: missingFields 
      });
    }

    const {
      name,
      mobileNumber,
      amount,
      orderData,
      addressId,
      userId,
      userEmail,
      userNumber,
      discountCode,
      pointsUsed,
    } = req.body;

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      console.error("❌ Invalid amount:", amount);
      
      await sendAdminAlert({
        severity: "WARNING",
        title: "Payment Order Creation Failed - Invalid Amount",
        error: new Error("Invalid amount provided"),
        context: {
          customerName: name,
          customerId: userId,
          customerPhone: mobileNumber,
          providedAmount: amount,
          operation: "Create Payment Order"
        }
      });
      
      return res.status(400).json({ 
        success: false,
        error: "Invalid amount" 
      });
    }

    // Validate orderData
    if (!Array.isArray(orderData) || orderData.length === 0) {
      console.error("❌ Invalid orderData");
      
      await sendAdminAlert({
        severity: "WARNING",
        title: "Payment Order Creation Failed - Invalid Order Data",
        error: new Error("Order data is empty or invalid"),
        context: {
          customerName: name,
          customerId: userId,
          customerPhone: mobileNumber,
          amount: amount,
          orderDataType: typeof orderData
        }
      });
      
      return res.status(400).json({ 
        success: false,
        error: "Invalid order data" 
      });
    }

    // Fetch address from database
    let addressData = null;
    try {
      console.log(`📍 Fetching address from database for addressId: ${addressId}, userId: ${userId}`);
      addressData = await getAddressFromDatabase(addressId, userId);
      console.log(`✅ Address fetched successfully:`, {
        name: addressData.address_name,
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode
      });
    } catch (addressError) {
      console.error("❌ Failed to fetch address:", addressError.message);
      
      await sendAdminAlert({
        severity: "ERROR",
        title: "Address Fetch Failed",
        error: addressError,
        context: {
          addressId: addressId,
          customerId: userId,
          customerName: name,
          customerPhone: mobileNumber,
          operation: "Fetch Address from Database"
        }
      });
      
      return res.status(400).json({ 
        success: false,
        error: "Failed to fetch delivery address",
        message: addressError.message
      });
    }

    // Generate unique order ID
    const orderId = generateOrderId();
    orderIds = orderId;
    console.log(`📦 Creating new order with ID: ${orderId}`);

    // Populate global paymentPayload with address from database
    paymentPayload = {
      merchantId: MERCHANT_ID,
      merchantUserId: name,
      mobileNumber: mobileNumber,
      amount: amount * 100,
      user_id: userId,
      addressId: addressId,
      userNumber: userNumber,
      userEmail: userEmail,
      orderData: orderData,
      merchantTransactionId: orderId,
      address: addressData, // Using address from database
      discountCode: discountCode,
      pointsUsed: pointsUsed || 0,
      redirectUrl: `${redirectUrl}/?id=${orderId}`,
      redirectMode: "POST",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    // Create base64 encoded payload and checksum
    const payload = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
    const keyIndex = 1;
    const stringToHash = payload + "/pg/v1/pay" + MERCHANT_KEY;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const checksum = `${sha256}###${keyIndex}`;

    const options = {
      method: "POST",
      url: MERCHANT_BASE_URL,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
      data: {
        request: payload,
      },
      timeout: 15000,
    };

    console.log("💳 Initiating payment request to PhonePe");
    const response = await axios.request(options);
    
    // Validate response structure
    if (!response.data || !response.data.data || 
        !response.data.data.instrumentResponse || 
        !response.data.data.instrumentResponse.redirectInfo ||
        !response.data.data.instrumentResponse.redirectInfo.url) {
      console.error("❌ Invalid response from payment gateway:", response.data);
      
      await sendAdminAlert({
        severity: "ERROR",
        title: "PhonePe Payment Gateway - Invalid Response",
        error: new Error("Invalid response structure from PhonePe"),
        context: {
          orderId: orderId,
          customerName: name,
          customerId: userId,
          customerPhone: mobileNumber,
          amount: amount,
          responseReceived: JSON.stringify(response.data).substring(0, 300),
          operation: "Payment Initiation"
        }
      });
      
      throw new Error("Invalid response from payment gateway");
    }
    
    const paymentRedirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
    const processingTime = Date.now() - requestStartTime;
    
    console.log(`✅ Payment initiated successfully in ${processingTime}ms`);
    
    return res.status(200).json({ 
      success: true,
      message: "Payment initiated successfully",
      url: paymentRedirectUrl,
      orderId: orderId
    });

  } catch (error) {
    const processingTime = Date.now() - requestStartTime;
    console.error("❌ Error initiating payment:", error.message);
    
    // Comprehensive error alert
    await sendAdminAlert({
      severity: "ERROR",
      title: "Payment Initiation Failed",
      error: error,
      context: {
        orderId: orderIds || 'Not generated',
        customerName: req.body.name,
        customerId: req.body.userId,
        customerPhone: req.body.mobileNumber,
        customerEmail: req.body.userEmail,
        amount: req.body.amount,
        operation: "Create Payment Order",
        processingTime: `${processingTime}ms`,
        errorType: error.response ? 'Gateway Error' : error.request ? 'Network Error' : 'Application Error'
      },
      stackTrace: error.stack
    });
    
    // Handle different types of errors
    if (error.response) {
      console.error("Payment gateway error response:", error.response.data);
      return res.status(error.response.status || 500).json({
        success: false,
        error: "Payment gateway error",
        message: error.response.data?.message || "Failed to initiate payment",
        code: error.response.data?.code
      });
    } else if (error.request) {
      console.error("No response received from payment gateway");
      return res.status(503).json({
        success: false,
        error: "Payment service unavailable",
        message: "No response received from payment gateway"
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Failed to initiate payment",
        message: error.message
      });
    }
  }
});

// ========== PAYMENT STATUS & ORDER PROCESSING ==========
router.post("/status", async (req, res) => {
  const merchantTransactionId = req.query.id;
  const processingStartTime = Date.now();
  let currentStep = "Initialization";
  
  try {
    console.log("\n" + "=".repeat(80));
    console.log("🔍 PAYMENT STATUS CHECK STARTED");
    console.log("=".repeat(80));

    // Validate transaction ID
    if (!merchantTransactionId) {
      console.error("❌ Missing transaction ID in request");
      
      await sendAdminAlert({
        severity: "WARNING",
        title: "Payment Status Check - Missing Transaction ID",
        error: new Error("Transaction ID not provided in request"),
        context: {
          step: "Transaction ID Validation",
          requestQuery: JSON.stringify(req.query),
          requestBody: JSON.stringify(req.body).substring(0, 200)
        }
      });
      
      return res.redirect(`${failureUrl}?error=missing_transaction_id`);
    }

    console.log(`📋 Transaction ID: ${merchantTransactionId}`);

    // ========== STEP 1: VERIFY PAYMENT STATUS ==========
    currentStep = "Payment Verification";
    console.log("\n📍 STEP 1: Verifying payment status with PhonePe...");
    
    const keyIndex = 1;
    const stringToHash = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const checksum = `${sha256}###${keyIndex}`;

    const options = {
      method: "GET",
      url: `${MERCHANT_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": MERCHANT_ID,
      },
      timeout: 15000,
    };

    let paymentResponse;
    try {
      paymentResponse = await axios.request(options);
    } catch (verifyError) {
      console.error("❌ Payment verification request failed:", verifyError.message);
      
      await sendAdminAlert({
        severity: "CRITICAL",
        title: "Payment Verification Request Failed",
        error: verifyError,
        context: {
          orderId: merchantTransactionId,
          step: currentStep,
          operation: "PhonePe Status API Call",
          merchantId: MERCHANT_ID
        },
        stackTrace: verifyError.stack
      });
      
      return res.redirect(`${failureUrl}?error=verification_failed`);
    }

    const responseData = paymentResponse.data;

    // Validate payment success
    if (!responseData.success || responseData.data.state !== "COMPLETED") {
      console.error("❌ Payment verification failed or incomplete");
      console.error("Payment Status:", responseData.data?.state);
      console.error("Payment Code:", responseData.code);
      
      await sendAdminAlert({
        severity: "WARNING",
        title: "Payment Not Completed",
        error: new Error(`Payment state: ${responseData.data?.state}`),
        context: {
          orderId: merchantTransactionId,
          paymentStatus: responseData.data?.state,
          paymentCode: responseData.code,
          customerName: paymentPayload?.merchantUserId,
          customerId: paymentPayload?.user_id,
          amount: responseData.data?.amount ? responseData.data.amount / 100 : 'Unknown',
          step: currentStep
        }
      });
      
      return res.redirect(`${failureUrl}?status=${responseData.data?.state}`);
    }

    console.log("✅ Payment verified successfully");
    console.log(`   Transaction ID: ${responseData.data.transactionId}`);
    console.log(`   Amount: ₹${responseData.data.amount / 100}`);
    console.log(`   State: ${responseData.data.state}`);

    // Extract payment details
    const paymentAmount = responseData.data.amount / 100;
    const transactionId = responseData.data.transactionId;
    const providerReferenceId = responseData.data.providerReferenceId || "";

    // ========== STEP 2: SAVE TRANSACTION DETAILS ==========
    currentStep = "Transaction Details Save";
    console.log("\n📍 STEP 2: Saving transaction details to database...");
    
    try {
      const transactionDetails = {
        transactionId: transactionId,
        code: responseData.code || "",
        providerReferenceId: providerReferenceId,
        order_id: merchantTransactionId,
        amount: paymentAmount,
      };

      await db.query(
        `INSERT INTO sg_order_transactions (transactionId, code, providerReferenceId, order_id, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [
          transactionDetails.transactionId,
          transactionDetails.code,
          transactionDetails.providerReferenceId,
          transactionDetails.order_id,
          transactionDetails.amount,
        ]
      );
      
      console.log("✅ Transaction details saved successfully");
    } catch (dbError) {
      console.error("❌ CRITICAL: Failed to save transaction details:", dbError.message);
      
      await sendAdminAlert({
        severity: "CRITICAL",
        title: "Transaction Details Save Failed",
        error: dbError,
        context: {
          orderId: merchantTransactionId,
          transactionId: transactionId,
          amount: paymentAmount,
          customerName: paymentPayload?.merchantUserId,
          customerId: paymentPayload?.user_id,
          customerPhone: paymentPayload?.userNumber,
          step: currentStep,
          paymentStatus: "COMPLETED",
          operation: "Database Insert - Transaction Table"
        },
        stackTrace: dbError.stack
      });
    }

    // ========== STEP 3: CREATE ORDER IN DATABASE (CRITICAL) ==========
    currentStep = "Order Creation";
    console.log("\n📍 STEP 3: Creating order in database...");
    
    let orderCreated = false;
    try {
      // Validate paymentPayload
      if (!paymentPayload || !paymentPayload.user_id) {
        throw new Error("Payment payload not found or invalid - session may have expired");
      }

      const orderDetails = {
        customer_id: paymentPayload.user_id,
        address_id: paymentPayload.addressId,
        total_amount: paymentAmount,
        actual_total_amount: paymentAmount,
        discount: 0,
        discount_code: paymentPayload.discountCode || null,
        quantity: paymentPayload.orderData?.length || 1,
        order_status: "Active",
        order_id: merchantTransactionId,
      };

      const orderDataString = JSON.stringify(paymentPayload.orderData || {});

      const [orderResult] = await db.query(
        `INSERT INTO sg_orders_online
         (id, order_id, customer_id, address_id, total_amount, actual_total_amount, discount, discount_code, order_status, order_data, order_track_id, c_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          0,
          merchantTransactionId,
          orderDetails.customer_id,
          orderDetails.address_id,
          orderDetails.total_amount,
          orderDetails.actual_total_amount,
          orderDetails.discount,
          orderDetails.discount_code,
          orderDetails.order_status,
          orderDataString,
          merchantTransactionId,
          paymentPayload.userNumber,
        ]
      );

      if (!orderResult || !orderResult.affectedRows) {
        throw new Error("Order insertion failed - no rows affected");
      }

      orderCreated = true;
      console.log("✅ Order created successfully in database");
      console.log(`   Order ID: ${merchantTransactionId}`);
      console.log(`   Customer ID: ${orderDetails.customer_id}`);
      console.log(`   Amount: ₹${orderDetails.total_amount}`);

    } catch (orderError) {
      console.error("❌ CRITICAL: Failed to create order in database:", orderError.message);
      
      // This is CRITICAL - payment succeeded but order not created
      await sendAdminAlert({
        severity: "CRITICAL",
        title: "🚨 ORDER CREATION FAILED - PAYMENT SUCCESSFUL 🚨",
        error: orderError,
        context: {
          orderId: merchantTransactionId,
          transactionId: transactionId,
          amount: paymentAmount,
          customerName: paymentPayload?.merchantUserId || 'Unknown',
          customerId: paymentPayload?.user_id || 'Unknown',
          customerPhone: paymentPayload?.userNumber || 'Unknown',
          customerEmail: paymentPayload?.userEmail || 'Unknown',
          addressId: paymentPayload?.addressId,
          paymentStatus: "COMPLETED ✅",
          orderStatus: "NOT CREATED ❌",
          step: currentStep,
          operation: "Database Insert - Orders Table",
          urgency: "IMMEDIATE ACTION REQUIRED",
          actionNeeded: "Create order manually in database",
          orderData: JSON.stringify(paymentPayload?.orderData || {}).substring(0, 500)
        },
        stackTrace: orderError.stack
      });

      return res.redirect(`${failureUrl}?error=order_creation_failed&transaction=${transactionId}`);
    }

    // ========== STEP 4: CLEAR CUSTOMER CART (CRITICAL) ==========
    currentStep = "Cart Clearing";
    console.log("\n📍 STEP 4: Clearing customer cart...");
    
    try {
      const customerId = String(paymentPayload.user_id);
      
      const [cartResult] = await db.query(
        "DELETE FROM sg_cart WHERE customer_id = ?",
        [customerId]
      );
      
      console.log(`✅ Cart cleared successfully: ${cartResult.affectedRows} items removed`);
    } catch (cartError) {
      console.error("❌ WARNING: Failed to clear cart:", cartError.message);
      
      await sendAdminAlert({
        severity: "WARNING",
        title: "Cart Clearing Failed",
        error: cartError,
        context: {
          orderId: merchantTransactionId,
          customerId: paymentPayload?.user_id,
          customerName: paymentPayload?.merchantUserId,
          amount: paymentAmount,
          paymentStatus: "COMPLETED",
          orderStatus: "CREATED",
          step: currentStep,
          operation: "Database Delete - Cart Table",
          actionNeeded: "Clear cart manually or user will see old items"
        }
      });
    }

    // ========== STEP 5: SEND WHATSAPP MESSAGES ==========
    currentStep = "WhatsApp Notifications";
    console.log("\n📍 STEP 5: Sending WhatsApp notifications...");
    
    try {
      // Fetch address if not available
      let addressForMessage = paymentPayload?.address;
      
      if (!addressForMessage && paymentPayload?.addressId && paymentPayload?.user_id) {
        try {
          console.log("   Fetching address from database for WhatsApp messages...");
          addressForMessage = await getAddressFromDatabase(
            paymentPayload.addressId, 
            paymentPayload.user_id
          );
          console.log("   ✅ Address fetched for WhatsApp messages");
        } catch (addrError) {
          console.error("   Failed to fetch address for WhatsApp:", addrError.message);
          addressForMessage = {
            address_name: 'Address not available',
            address_line_1: '',
            address_line_2: '',
            city: '',
            state: '',
            pincode: '',
            country: ''
          };
        }
      }

      // Prepare address message
      const addressMessage = `
${addressForMessage?.address_name || ''}
${addressForMessage?.address_line_1 || ''}
${addressForMessage?.address_line_2 || ''}
${addressForMessage?.city || ''}
${addressForMessage?.state || ''}
${addressForMessage?.pincode || ''}
${addressForMessage?.country || ''}
      `.trim();

      const orderDetailsMess = paymentPayload.orderData || [];

      // Vendor message
      const vendorMessage = `
🔔 *New Order Received!*

👤 *Customer Details:*
Name: ${paymentPayload.merchantUserId}
User ID: ${paymentPayload.user_id}
Phone: ${paymentPayload.userNumber}
Email: ${paymentPayload.userEmail || 'N/A'}

📦 *Order Information:*
Order ID: ${merchantTransactionId}
Transaction ID: ${transactionId}
Amount: ₹${paymentAmount}
Payment Status: PAID ✅

📍 *Delivery Address:*
${addressMessage}

🛍️ *Order Items:*
${orderDetailsMess.map((order, index) => {
  const details = [
    `\n*Item ${index + 1}:*`,
    order.pr_name ? `Product: ${order.pr_name}` : null,
    order.pr_sku ? `SKU: ${order.pr_sku}` : null,
    order.quantity ? `Quantity: ${order.quantity}` : null,
    order.price ? `Price: ₹${order.price}` : null,
    order.lens_package_name ? `Lens Package: ${order.lens_package_name}` : null,
    order.lens_type_name ? `Lens Type: ${order.lens_type_name}` : null,
    order.contact_lens_name ? `Contact Lens: ${order.contact_lens_name}` : null,
    order.prescription ? `\n${formatPrescriptionTable(order.prescription)}` : null,
  ];
  return details.filter(Boolean).join("\n");
}).join("\n---")}

⏰ *Order Time:* ${getCurrentDateTime()}
      `.trim();

      // Customer message
      const customerMessage = `
🎉 *Order Confirmed!*

Dear ${paymentPayload.merchantUserId},

✅ Your order has been successfully placed!

📋 *Order Details:*
Order ID: ${merchantTransactionId}
Transaction ID: ${transactionId}
Amount Paid: ₹${paymentAmount}
Order Date: ${getCurrentDateTime()}

📍 *Delivery Address:*
${addressMessage}

${orderDetailsMess.map((item, index) => {
  return `\n*🔹 Item ${index + 1}: ${item.pr_name || item.product_name || 'Product'}*
${item.prescription ? formatPrescriptionTable(item.prescription) : 'No prescription for this item'}
  `;
}).join('\n')}

🚚 Your order will be processed and shipped soon.
📞 For any queries, please contact our support team.

✨ *Thank you for shopping with us!*
      `.trim();

      // Send to vendor
      let vendorMessageSent = false;
      try {
        if (process.env.PHONE_NUMBER) {
          console.log(`📤 Sending vendor notification to ${process.env.PHONE_NUMBER}...`);
          const vendorResult = await sendWhatsAppMessage(process.env.PHONE_NUMBER, vendorMessage);
          vendorMessageSent = vendorResult.success;
          
          if (vendorResult.success) {
            console.log("✅ Vendor notification sent successfully");
          } else {
            console.error("❌ Vendor notification failed:", vendorResult.error);
          }
        } else {
          console.warn("⚠️  Vendor phone number not configured");
        }
      } catch (vendorMsgError) {
        console.error("❌ Failed to send vendor notification:", vendorMsgError.message);
        
        await sendAdminAlert({
          severity: "WARNING",
          title: "Vendor WhatsApp Notification Failed",
          error: vendorMsgError,
          context: {
            orderId: merchantTransactionId,
            transactionId: transactionId,
            customerName: paymentPayload?.merchantUserId,
            amount: paymentAmount,
            step: currentStep,
            operation: "Send WhatsApp - Vendor",
            vendorPhone: process.env.PHONE_NUMBER
          }
        });
      }

      // Send to customer
      let customerMessageSent = false;
      try {
        if (paymentPayload.userNumber) {
          console.log(`📤 Sending customer notification to ${paymentPayload.userNumber}...`);
          const customerResult = await sendWhatsAppMessage(paymentPayload.userNumber, customerMessage);
          customerMessageSent = customerResult.success;
          
          if (customerResult.success) {
            console.log("✅ Customer notification sent successfully");
          } else {
            console.error("❌ Customer notification failed:", customerResult.error);
          }
        } else {
          console.warn("⚠️  Customer phone number not available");
        }
      } catch (customerMsgError) {
        console.error("❌ Failed to send customer notification:", customerMsgError.message);
        
        await sendAdminAlert({
          severity: "WARNING",
          title: "Customer WhatsApp Notification Failed",
          error: customerMsgError,
          context: {
            orderId: merchantTransactionId,
            transactionId: transactionId,
            customerName: paymentPayload?.merchantUserId,
            customerId: paymentPayload?.user_id,
            customerPhone: paymentPayload?.userNumber,
            amount: paymentAmount,
            step: currentStep,
            operation: "Send WhatsApp - Customer",
            actionNeeded: "Customer not notified - call them manually"
          }
        });
      }

      if (!vendorMessageSent && !customerMessageSent) {
        console.error("❌ No WhatsApp messages were sent successfully");
      } else if (vendorMessageSent && customerMessageSent) {
        console.log("✅ All WhatsApp notifications sent successfully");
      } else if (vendorMessageSent) {
        console.warn("⚠️  Only vendor notification sent, customer notification failed");
      } else if (customerMessageSent) {
        console.warn("⚠️  Only customer notification sent, vendor notification failed");
      }

    } catch (whatsappError) {
      console.error("❌ WhatsApp notification error:", whatsappError.message);
      
      await sendAdminAlert({
        severity: "WARNING",
        title: "WhatsApp Notification System Error",
        error: whatsappError,
        context: {
          orderId: merchantTransactionId,
          transactionId: transactionId,
          customerName: paymentPayload?.merchantUserId,
          amount: paymentAmount,
          step: currentStep,
          operation: "WhatsApp Message Preparation"
        }
      });
    }

    // ========== STEP 6: UPDATE MEMBERSHIP & WALLET ==========
    currentStep = "Membership & Wallet Update";
    console.log("\n📍 STEP 6: Processing membership and wallet updates...");
    
    if (paymentPayload.pointsUsed && paymentPayload.pointsUsed > 0) {
      try {
        const customerId = paymentPayload.user_id;
        console.log(`   Points used: ${paymentPayload.pointsUsed}`);
        
        // Check if this is the customer's first order
        const [existingOrders] = await db.query(
          "SELECT COUNT(*) as order_count FROM sg_orders_online WHERE customer_id = ? AND order_id != ?",
          [customerId, merchantTransactionId]
        );
        
        const isFirstOrder = existingOrders[0].order_count === 0;
        console.log(`   Is first order: ${isFirstOrder ? 'Yes' : 'No'}`);
        
        // Get current wallet balance
        const [customerData] = await db.query(
          "SELECT wallet, genie_gold_member FROM sg_customer_online WHERE id = ?",
          [customerId]
        );
        
        if (customerData.length > 0) {
          const currentWallet = parseFloat(customerData[0].wallet) || 0;
          const newWalletBalance = Math.max(0, currentWallet - paymentPayload.pointsUsed);
          
          console.log(`   Current wallet: ₹${currentWallet}`);
          console.log(`   New wallet: ₹${newWalletBalance}`);
          
          if (isFirstOrder) {
            // First order: Update wallet and activate gold membership
            const membershipCode = generateCode(customerId);
            
            await db.query(
              `UPDATE sg_customer_online 
               SET wallet = ?, 
                   genie_gold_member = 1, 
                   member_ship_code = ? 
               WHERE id = ?`,
              [newWalletBalance, membershipCode, customerId]
            );
            
            console.log(`✅ First order processed: Gold membership activated`);
            console.log(`   Membership code: ${membershipCode}`);
          } else {
            // Repeat order: Only update wallet
            await db.query(
              `UPDATE sg_customer_online 
               SET wallet = ? 
               WHERE id = ?`,
              [newWalletBalance, customerId]
            );
            
            console.log(`✅ Wallet updated for repeat order`);
          }
        } else {
          throw new Error(`Customer with ID ${customerId} not found in database`);
        }
      } catch (membershipError) {
        console.error("❌ Failed to update membership/wallet:", membershipError.message);
        
        await sendAdminAlert({
          severity: "ERROR",
          title: "Membership/Wallet Update Failed",
          error: membershipError,
          context: {
            orderId: merchantTransactionId,
            transactionId: transactionId,
            customerId: paymentPayload?.user_id,
            customerName: paymentPayload?.merchantUserId,
            pointsUsed: paymentPayload?.pointsUsed,
            amount: paymentAmount,
            step: currentStep,
            operation: "Database Update - Customer Wallet/Membership",
            actionNeeded: "Update customer wallet and membership manually"
          },
          stackTrace: membershipError.stack
        });
      }
    } else {
      console.log("   No points used, skipping wallet update");
    }

    // ========== STEP 7: CREATE SHIPROCKET ORDER ==========
    currentStep = "Shiprocket Order Creation";
    console.log("\n📍 STEP 7: Creating Shiprocket shipment order...");
    
    try {
      // Fetch address if not available in paymentPayload
      let addressForShipping = paymentPayload?.address;
      
      if (!addressForShipping && paymentPayload?.addressId && paymentPayload?.user_id) {
        console.log("   Fetching address from database for Shiprocket...");
        try {
          addressForShipping = await getAddressFromDatabase(
            paymentPayload.addressId, 
            paymentPayload.user_id
          );
          console.log("   ✅ Address fetched for Shiprocket");
        } catch (addrError) {
          console.error("   ❌ Failed to fetch address for Shiprocket:", addrError.message);
          throw new Error(`Failed to fetch shipping address: ${addrError.message}`);
        }
      }

      if (!addressForShipping) {
        throw new Error("No shipping address available for Shiprocket order");
      }

      const token = await getAccessToken();
      console.log("   Shiprocket token obtained");

      const shiprocketOrderData = {
        order_id: merchantTransactionId,
        order_date: getCurrentDateTime(),
        pickup_location: "work",
        channel_id: "",
        comment: "",
        billing_customer_name: paymentPayload?.merchantUserId || "",
        billing_last_name: "",
        billing_address: addressForShipping?.address_line_1 || "",
        billing_address_2: addressForShipping?.address_line_2 || "",
        billing_city: addressForShipping?.city || "",
        billing_pincode: String(addressForShipping?.pincode || "").trim(),
        billing_state: addressForShipping?.state || "",
        billing_country: addressForShipping?.country || "India",
        billing_email: paymentPayload?.userEmail || "",
        billing_phone: String(paymentPayload?.userNumber || "").trim(),
        shipping_is_billing: true,
        shipping_customer_name: "",
        shipping_last_name: "",
        shipping_address: "",
        shipping_address_2: "",
        shipping_city: "",
        shipping_pincode: "",
        shipping_country: "",
        shipping_state: "",
        shipping_email: "",
        shipping_phone: "",
        order_items: (paymentPayload?.orderData || []).map((item, i) => ({
          name: item?.pr_name || item?.product_name || "Product",
          sku: String(Number(item?.pr_sku || 0) + i + 1),
          units: parseInt(item?.quantity) || 1,
          selling_price: parseFloat(item?.price) || 0,
          discount: parseFloat(item?.discount) || 0,
          tax: 0,
          hsn: 441122,
        })),
        payment_method: "Prepaid",
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total: parseFloat(paymentAmount),
        length: 10,
        breadth: 15,
        height: 20,
        weight: 2.5,
      };

      console.log("   📦 Shiprocket Order Data:");
      console.log(`      Order ID: ${shiprocketOrderData.order_id}`);
      console.log(`      Customer: ${shiprocketOrderData.billing_customer_name}`);
      console.log(`      Phone: ${shiprocketOrderData.billing_phone}`);
      console.log(`      Email: ${shiprocketOrderData.billing_email}`);
      console.log(`      City: ${shiprocketOrderData.billing_city}`);
      console.log(`      Pincode: ${shiprocketOrderData.billing_pincode}`);
      console.log(`      State: ${shiprocketOrderData.billing_state}`);
      console.log(`      Items: ${shiprocketOrderData.order_items.length}`);
      console.log(`      Total: ₹${shiprocketOrderData.sub_total}`);

      const shiprocketConfig = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        data: shiprocketOrderData,
        timeout: 15000,
      };

      const shiprocketResponse = await axios(shiprocketConfig);
      
      if (shiprocketResponse.data && shiprocketResponse.data.order_id) {
        console.log("✅ Shiprocket order created successfully");
        console.log(`   Shiprocket Order ID: ${shiprocketResponse.data.order_id}`);
        console.log(`   Shipment ID: ${shiprocketResponse.data.shipment_id || 'N/A'}`);
      } else {
        console.warn("⚠️  Shiprocket order created but response unclear");
        console.warn("   Response:", JSON.stringify(shiprocketResponse.data).substring(0, 200));
      }

    } catch (shiprocketError) {
      console.error("❌ Failed to create Shiprocket order:", shiprocketError.message);
      
      // Log detailed error information
      if (shiprocketError.response) {
        console.error("📄 Shiprocket Error Status:", shiprocketError.response.status);
        console.error("📄 Shiprocket Error Data:", JSON.stringify(shiprocketError.response.data, null, 2));
        console.error("📄 Shiprocket Request Data that was sent:");
        console.error(JSON.stringify({
          order_id: merchantTransactionId,
          customer_name: paymentPayload?.merchantUserId,
          phone: paymentPayload?.userNumber,
          email: paymentPayload?.userEmail,
          address: paymentPayload?.address,
          items: paymentPayload?.orderData?.length,
        }, null, 2));
      }
      
      // Send detailed alert about Shiprocket failure
      await sendAdminAlert({
        severity: "ERROR",
        title: "Shiprocket Order Creation Failed",
        error: shiprocketError,
        context: {
          orderId: merchantTransactionId,
          transactionId: transactionId,
          customerId: paymentPayload?.user_id,
          customerName: paymentPayload?.merchantUserId,
          customerPhone: paymentPayload?.userNumber,
          customerEmail: paymentPayload?.userEmail,
          amount: paymentAmount,
          deliveryAddress: JSON.stringify(paymentPayload?.address || {}).substring(0, 200),
          step: currentStep,
          operation: "Shiprocket API - Create Order",
          paymentStatus: "COMPLETED",
          orderStatus: "CREATED IN DB",
          shiprocketStatus: "NOT CREATED",
          shiprocketErrorResponse: shiprocketError.response?.data ? JSON.stringify(shiprocketError.response.data) : 'No error response',
          actionNeeded: "Create shipment order manually in Shiprocket",
          shiprocketOrderData: JSON.stringify(paymentPayload?.orderData || {}).substring(0, 300)
        },
        stackTrace: shiprocketError.stack
      });
    }

    // ========== FINAL STEP: REDIRECT TO SUCCESS ==========
    const totalProcessingTime = Date.now() - processingStartTime;
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ ORDER PROCESSING COMPLETED SUCCESSFULLY");
    console.log(`⏱️  Total Processing Time: ${totalProcessingTime}ms`);
    console.log("=".repeat(80) + "\n");
    
    return res.redirect(`${successUrl}?order=${merchantTransactionId}`);

  } catch (error) {
    const totalProcessingTime = Date.now() - processingStartTime;
    
    console.error("\n" + "=".repeat(80));
    console.error("❌ CRITICAL ERROR IN PAYMENT STATUS PROCESSING");
    console.error("=".repeat(80));
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    
    // Send comprehensive critical error alert
    await sendAdminAlert({
      severity: "CRITICAL",
      title: "🚨 CRITICAL PAYMENT PROCESSING ERROR 🚨",
      error: error,
      context: {
        orderId: merchantTransactionId,
        step: currentStep,
        customerName: paymentPayload?.merchantUserId || 'Unknown',
        customerId: paymentPayload?.user_id || 'Unknown',
        customerPhone: paymentPayload?.userNumber || 'Unknown',
        customerEmail: paymentPayload?.userEmail || 'Unknown',
        amount: paymentPayload?.amount ? paymentPayload.amount / 100 : 'Unknown',
        processingTime: `${totalProcessingTime}ms`,
        operation: "Payment Status & Order Processing",
        urgency: "INVESTIGATE IMMEDIATELY",
        possibleImpact: "Customer may have paid but order not processed",
        errorType: error.response ? 'API Error' : error.code === 'ECONNREFUSED' ? 'Database/Network Error' : 'Application Error',
        paymentPayload: JSON.stringify(paymentPayload || {}).substring(0, 500)
      },
      stackTrace: error.stack
    });
    
    // Determine appropriate error response
    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        return res.redirect(`${failureUrl}?error=transaction_not_found`);
      } else if (status === 401) {
        return res.redirect(`${failureUrl}?error=authentication_failed`);
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.redirect(`${failureUrl}?error=service_unavailable`);
    }
    
    return res.redirect(`${failureUrl}?error=processing_failed`);
  }
});

router.post("/addTransaction", authenticateToken, addTransactionDetails);

module.exports = router;