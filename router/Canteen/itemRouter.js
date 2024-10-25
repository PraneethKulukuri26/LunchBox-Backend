const express=require('express')
const router=express.Router();

const controller=require('../../Controller/Canteen/itemController');



router.get('/getItems',controller.CanteengetItems);
router.delete('/remove',controller.deleteItem);
router.patch('/update',controller.updateItem);
router.post('/add',controller.addItem);

module.exports=router