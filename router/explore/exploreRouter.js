const express=require("express");
const router=express.Router();

const itemsExplore=require('../../Controller/Explore/Items/itemController');
router.get('/items',itemsExplore.getItemsByCanteen);
router.get('/item',itemsExplore.getItemById);


module.exports=router;