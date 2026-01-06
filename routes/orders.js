const express = require("express");
const { getAllOrdersByCustomerID, getSpecificOrder, addNewOrder } = require("../controller/ordersController");
const authenticateToken = require("../middleware/authentiactToken"); // Import the middleware

const router = express.Router();

//get All orders of a user
router.get("/getAllOrdersByCustomerID/:id", authenticateToken, getAllOrdersByCustomerID);

//get specific order
router.get("/getSpecificOrder/:id", authenticateToken, getSpecificOrder);

//add new order
router.post("/addNewOrder", authenticateToken, addNewOrder)

module.exports = router