const express = require("express");
const { getAllCustomers,updateReferalForNewUSer,updateReferalForExistingUSer ,getCustomerById, addNewCustomer, getCustomerAddresses, editCustomer, fetchFile } = require("../controller/customersController");


//router object
const router = express.Router();

//get all products
router.get("/allCustomers", getAllCustomers);

//get product by ID
router.get("/getCustomerById/:id",  getCustomerById)

//Add Product
router.post("/addNewCustomer",  addNewCustomer)

router.post("/editCustomer",  editCustomer)

router.post("/updateReferalForNewUSer",  updateReferalForNewUSer)

router.post("/updateReferalForExistingUSer",  updateReferalForExistingUSer)

//Get customer addresses
router.get("/getCustomerAddresses/:id",  getCustomerAddresses)

router.get("/getFile",  fetchFile)

module.exports = router