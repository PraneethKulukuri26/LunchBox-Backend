const express=require("express");
const router=express.Router();

const itemsExplore=require('../../Controller/Explore/Items/itemController');
router.get('/items',itemsExplore.getItemsByCanteen);
router.get('/item',itemsExplore.getItemById);

const cartsExplore=require('../../Controller/Explore/canteen/canteenController');
router.get('/canteens',cartsExplore.getCanteens);


module.exports=router;