<?php

namespace App\Models;

use CodeIgniter\Database\ConnectionInterface;
use CodeIgniter\Model;

class Authentication extends Model
{
    protected $db;
    public function __construct(ConnectionInterface &$db)
    {
        $this->db = &$db;
    }

    public function login($email, $password)
    {
        return $this->db->table('sg_branch')->select('br_email, br_id')->getWhere(["br_email" => $email, "br_password" => $password])->getRow();
    }

    public function register($data)
    {
        return $this->db->table('admin')->insert($data) ? true : false;
    }

    public function checkIfAdminAlreadyExist($email)
    {
        return $this->db->table('sg_branch')->select('*')->where('br_email', $email)->get()->getNumRows() > 0 ? true : false;
    }


    // Customer Queries
    public function registercustomer($data)
    {
        return $this->db->table('sg_customer_online')->insert($data) ? true : false;
    }

    public function checkIfCustomerAlreadyExist($email)
    {
        return $this->db->table('sg_customer_online')->select('*')->where('email', $email)->get()->getNumRows() > 0 ? true : false;
    }

    public function checkIfCustomerAlreadyExistWithGoogleId($email, $googleId)
    {
        return $this->db->table('sg_customer_online')->select('*')->getWhere(["email" => $email, "google_profile_id" => $googleId])->getNumRows() > 0 ? true : false;
    }

    public function getCustomerById($id)
    {
        return $this->db->table('sg_customer_online')->select('id, name, email, mobile, referral_code')->where('id', $id)->get()->getRow();
    }

    public function getCustomerByEmailId($emailId)
    {
        return $this->db->table('sg_customer_online')->select('id, email')->where('email', $emailId)->get()->getRow();
    }

    public function checkCustomerByEmailAndId($emailId, $id)
    {
        return $this->db->table('sg_customer_online')->select('*')->getWhere(["email" => $emailId, "id" => $id])->getNumRows() > 0 ? true : false;
    }

    public function customerlogin($email, $password)
    {
        return $this->db->table('sg_customer_online')->select('id, email, name, mobile')->getWhere(["email" => $email, "password" => $password])->getRow();
    }

    public function customerLoginWithGoogleId($email, $googleId)
    {
        return $this->db->table('sg_customer_online')->select('id, email, name, mobile')->getWhere(["email" => $email, "google_profile_id" => $googleId])->getRow();
    }


    public function updateProfile($data, $id)
    {
        return $this->db->table('sg_customer_online')->where('id', $id)->update($data) ? true : false;
    }

    public function updateAddress($data, $addressId)
    {
        return $this->db->table('sg_customer_address')->where('id', $addressId)->update($data) ? true : false;
    }

    public function addCustomerAddress($data)
    {
        return $this->db->table('sg_customer_address')->insert($data) ? true : false;
    }

    public function getCustomerAddressByAddressId($addressId)
    {
        return $this->db->table('sg_customer_address')->select('*')->where('id', $addressId)->get()->getRow();
    }

    public function fetchCustomerAddressess($customerId)
    {
        return $this->db->table('sg_customer_address')->select('*')->where('customer_id', $customerId)->get()->getResult();
    }
}
