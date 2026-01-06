const db = require("../config/db");

//Get all Coupons
const getAllCoupons = async (req,res) => {
    try {
        const data = await db.query("SELECT * FROM sg_coupons");
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

module.exports = {getAllCoupons};