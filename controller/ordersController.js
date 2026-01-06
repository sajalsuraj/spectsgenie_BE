const db = require("../config/db");

//Get all Orders of a specific customer
const getAllOrdersByCustomerID = async (req, res) => {



    try {
        const customerId = req.params.id;
        const data = await db.query("SELECT * FROM sg_orders_online WHERE customer_id = ?",[customerId] );
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
};



//Get all Orders of a specific customer
const getSpecificOrder = async (req,res) => {
    try {
        const orderId = req.params.id;
        const data = await db.query("SELECT * FROM sg_orders_online WHERE order_id = ?",[orderId]);
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

const addNewOrder = async (req, res) => {
    try {
        const {
            order_id,
            customer_id,
            address_id,
            total_amount,
            actual_total_amount,
            discount,
            discount_code,
            order_status
        } = req.body;

        const query = `
            INSERT INTO sg_orders_online (
                order_id, customer_id, address_id, total_amount, actual_total_amount, 
                discount, discount_code, order_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            order_id,
            customer_id,
            address_id,
            total_amount,
            actual_total_amount,
            discount,
            discount_code,
            order_status || "pending" // Default status to "pending" if not provided
        ];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error("Error inserting data: ", err);
                res.status(500).json({ error: "Failed to insert data" });
            } else {
                res.status(201).json({ 
                    message: "Order added successfully", 
                    id: result.insertId 
                });
            }
        });
    } catch (error) {
        console.log("Error:", error);
        res.status(400).send({
            success: false,
            message: "Error in adding order",
            error
        });
    }
};




module.exports = {getAllOrdersByCustomerID , getSpecificOrder, addNewOrder};