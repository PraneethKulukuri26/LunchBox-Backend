const express=require('express')
const router=express.Router();

const controller=require('../../Controller/Canteen/itemController');



router.get('/getItems',controller.CanteengetItems);
router.delete('/remove',controller.deleteItem);
router.patch('/updateData',controller.updateItemData);
router.post('/add',controller.addItem);
router.patch('/updateImages',controller.updateItemImages);

module.exports=router