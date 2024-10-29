const express=require("express");
const router=express.Router();

const orderController=require('../../Controller/User/orderController')


router.get('/addToCart',orderController.addToCart);
router.delete('/removeItemCart',orderController.removeFromCart);
router.delete('/clearCart',orderController.clearCart);

module.exports=router;