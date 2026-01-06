const db = require("../config/db");

//Get Lens types based on product id
const getLensTypes = async (req,res) => {
    try {
        const productId = req.params.id;
        const data = await db.query("SELECT * FROM sg_lens_type lt WHERE FIND_IN_SET(lt.id, (SELECT lens_type_ids FROM sg_product sp WHERE pr_id = ?)) > 0", [productId]);
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

const getLensPackages= async (req,res) => {
    try {
        const productId = req.params.id;
        const caId = req.params.caId;
        const data = await db.query("SELECT DISTINCT spk.* FROM sg_product sp JOIN sg_lens_type slt ON FIND_IN_SET(slt.id, sp.lens_type_ids) JOIN sg_lens_package spk ON FIND_IN_SET(slt.uid, spk.lens_type_ids) WHERE sp.pr_id = ? and spk.ca_id = ? order by spk.id", [productId,caId]);
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

const getLensPackageUpgradeById = async (req, res) => {
    try {
        const upgradeId = req.params.id;
        console.log(upgradeId);
        const data = await db.query("SELECT id, name, description, `type`, price FROM lens_package_upgrades WHERE lens_package_id = ?", [upgradeId]);
        
        if(!data || data[0].length === 0){
            res.status(404).send({
                success: false,
                message: "No record found"
            });
        } else {
            res.status(200).send({
                success: true,
                message: "Records fetched",
                data: data[0],
                totalRecords: data[0].length
            });
        }
    } catch (error) {
        console.log(error);
        res.status(400).send({
            success: false,
            message: "Something went wrong",
            error
        });
    }
}

module.exports = {getLensTypes, getLensPackages, getLensPackageUpgradeById};