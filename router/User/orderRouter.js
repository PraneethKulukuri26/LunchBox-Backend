const express=require("express");
const router=express.Router();

const orderController=require('../../Controller/User/orderController')


router.get('/addToCart',orderController.addToCart);
router.get('/removeItemCart',orderController.removeFromCart);

module.exports=router;