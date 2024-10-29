const express=require("express");
const router=express.Router();

const orderController=require('../../Controller/User/orderController')


router.get('/addToCart',orderController.addToCart);

module.exports=router;