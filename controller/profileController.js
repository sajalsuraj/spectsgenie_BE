const db = require("../config/db");

//Get Cart items by ID
const getProfileDetails = async (req,res) => {
    try {
        const customerId = req.params.id;
        const data = await db.query("SELECT * FROM user_profile_activity WHERE id = ?",[customerId] );
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


const  getRefId = async (req,res) => {
    try {
        const customerId = req.params.id;
        const data = await db.query("SELECT id,referral_code FROM sg_customer_online WHERE id = ?",[customerId] );
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

const checkIfEmailOrMobileExists = async (req, res) => {
  try {
    const { identifier } = req.params; // This can be either email or mobile

    const [result] = await db.query(
      `SELECT EXISTS (
         SELECT 1 FROM sg_customer_online
         WHERE email = ? OR mobile = ?
       ) AS existsFlag`,
      [identifier, identifier]
    );
        let exists = false;
       
    if(result[0].existsFlag === 1){
        exists = true;
    }

    res.status(200).send({
      success: true,
      exists,
      message: exists ? "Email or mobile exists in the database." : "Not found."
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Server error while checking email/mobile existence.",
      error
    });
  }
};


module.exports = {getProfileDetails,getRefId,checkIfEmailOrMobileExists};