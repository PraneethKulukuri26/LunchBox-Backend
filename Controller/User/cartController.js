const redis=require('../../Config/redisClint');
const db=require('../../Config/mysqlDb.js');
const itemRepo=require('../../Services/itemsServices/itemsCRUD.js');
const fs=require('fs').promises;
const path=require('path');
const itemTime=process.env.redis_time_item;
const cartTime=process.env.redis_time_cart;

async function addToCart(req,res) {

  try{
    const itemId=req.query.id;
    const quantity=req.query.quantity;
    const userId=req.payload.userId;

    if (!itemId || !quantity) {
      let missingParam = !itemId ? 'itemId' : 'quantity';
      return res.status(400).json({
          code: 0,
          message: `${missingParam} is missing. Please provide all required parameters.`
      });
    }

    let [cacheCart, item] = await Promise.all([
      redis.get("UserCart_" + userId),
      redis.get("CanteenItem:" + itemId)
    ]);

    if(!item){

      try {

        const itemData=await itemRepo.getItemById(itemId);

        if(!itemData){
          return res.status(404).json({
            code: 0,
            message: "Item not found."
          });
        }

        await redis.setex("CanteenItem:" + itemId, itemTime, JSON.stringify(itemData));
        item = itemData;
      } catch (err) {
        return res.status(500).json({ code: -1, message: 'Internal server error.' });
      }

    }else{
      item = JSON.parse(item);
    }

    let {ava,StartingTime,EndingTime}=item;
    const currentTime=new Date();
    if(!ava){
      return res.json({code:-1,message:`Item Id ${itemId} is currently unavailable.`});
    }
    
    if(StartingTime&&EndingTime) {
      let startTime=new Date();
      let endTime=new Date();
      
      const [startHour,startMinute]=StartingTime.split(":" ).map(Number);
      const [endHour,endMinute]=EndingTime.split(":" ).map(Number);
      
      startTime.setHours(startHour, startMinute, 0);
      endTime.setHours(endHour, endMinute, 0);
      
      if(currentTime<startTime||currentTime>endTime){
        return res.json({code:0,message:`Item ID ${cartItem.itemId} is only available from ${StartingTime} to ${EndingTime}.`});
      }
    }

    if(cacheCart){
      cacheCart=JSON.parse(cacheCart);

      if(cacheCart.cart.some(cartItem=>cartItem.itemId==itemId)){
        return res.status(200).json({
          code: 1,
          message: 'Item added to cart successfully.'
        });
      }

      if (cacheCart.canteenId && cacheCart.canteenId !== item.canteenId) {
        return res.status(409).json({
          code: 0,
          message: 'All items in the cart must be from the same canteen.'
        });
      }

      cacheCart.cart = cacheCart.cart || [];
      cacheCart.cart.push({ itemId: itemId, quantity: quantity });

    }else{
      cacheCart = {
        canteenId: item.canteenId,
        cart: [{ itemId: itemId, quantity: quantity }]
      };
    }

    await redis.setex("UserCart_" + userId, cartTime, JSON.stringify(cacheCart));

    return res.status(200).json({
      code: 1,
      message: 'Item added to cart successfully'
    });

  }catch(err){
    console.log(err.message);
    return res.status(500).json({code:-1,message:'Internal Server error'});
  }
}

async function removeFromCart(req,res) {
  try{
    const itemId=Number(req.query.id);
    const userId=req.payload.userId;

    if(!itemId){
      return res.status(400).json({
        code: 0,
        message: `ItemId is missing. Please provide all required parameters.`
      });
    }

    let cacheCart=await redis.get("UserCart_"+userId);
    if(!cacheCart){
      return res.status(404).json({code:0,message:"cart data not found."});
    }

    cacheCart=JSON.parse(cacheCart);

    let itemFound = false;
    cacheCart.cart = cacheCart.cart.filter(item => {
      if (item.itemId == itemId) {
        itemFound = true;
        return false;
      }
      return true;
    });

    if (!itemFound) {
      return res.status(404).json({
        code: 0,
        message: `Item with itemId ${itemId} not found in cart.`,
      });
    }

    if (cacheCart.cart.length === 0) {
      await redis.del("UserCart_" + userId);
    } else {
      await redis.setex("UserCart_" + userId, cartTime, JSON.stringify(cacheCart));
    }

    return res.status(200).json({
      code: 1,
      message: "Item successfully removed from the cart.",
    });

  }catch(err){
    console.log(err.message);
    return res.status(500).json({code:-1,message:'Internal Server error'});
  }
}

async function clearCart(req,res) {
  try{
    const userId=req.payload.userId;

    const cacheCart=await redis.get("UserCart_"+userId);
    if(!cacheCart){
      return res.status(404).json({code:0,message:"cart data not found."});
    }

    await redis.del("UserCart_"+userId);

    return res.status(200).json({code:1,message:"The cart has been cleared successfully."});

  }catch(err){
    console.log(err.message);
    return res.status(500).json({code:-1,message:'Internal Server error'});
  }
}

async function updateCart(req,res) {
  
  try{
    const userId=req.payload.userId;
    let obj=req.body;

    let cacheCart=await redis.get("UserCart_"+userId);
    if(!cacheCart){
      return res.status(404).json({code:0,message:"cart data not found."});
    }  

    cacheCart=JSON.parse(cacheCart);
    if(cacheCart.canteenId==-9){
      return res.json({code:0,message:'Cart is empty.'});
    }

    if (Object.keys(obj).length === 0) {
      return res.status(400).json({
        code: 0,
        message: "Request body is empty. Please provide the necessary data."
      });
    }

    if (!Array.isArray(obj)) {
      obj=[obj];
    }
    
    let newCart=[];
    let errors=[];
    const cacheCartItems = new Set(cacheCart.cart.map(it => Number(it.itemId)));

    for(let item of obj){
      if(!item.itemId || typeof item.quantity!=='number'){
        errors.push(`Invalid item data: ${JSON.stringify(item)}`);
        continue;
      }

      if (item.quantity > 0) {
        if(!cacheCartItems.has(item.itemId)) {
            errors.push(`Item ID ${item.itemId} not found in the cart.`);
        }
        newCart.push(item);
      }
    }

    if(errors.length>=1){
      return res.status(400).json({code:0,message:"Errors in update request.",errors:errors});
    }

    cacheCart.cart=newCart;

    await redis.setex("UserCart_"+userId,cartTime,JSON.stringify(cacheCart));

    return res.status(200).json({code:1,message:'Cart Updated Successfully.'});
    
  }catch(err){
    console.error(err.message);
    return res.status(500).json({code:-1,message:'Internal Server error'});
  }

}

async function getCartItems(req,res) {

  const userId=req.payload.userId;

  try{
    let cacheCart=await redis.get("UserCart_"+userId);
    if(!cacheCart){
      return res.status(404).json({code:0,message:"cart data not found."});
    }  

    cacheCart=JSON.parse(cacheCart);
    if(cacheCart.canteenId==-9 || cacheCart.cart.length==0){
      return res.json({code:0,message:'Cart is empty.'});
    }

    let cart=[];
    const currentTime=new Date();

    let itemKeys=cacheCart.cart.map(cartItem=>"CanteenItem:"+cartItem.itemId);
    let itemsData = await redis.mget(itemKeys);

    cacheCart.cart.forEach((cartItem,index)=>{
      if(!itemsData[index]){
        missingItems.push(cartItem.itemId);
        missingIndices.push(index);
      }else{
        itemsData[index]=JSON.parse(itemsData[index]);
      }
    });

    if (missingItems.length>0) {
      let dbResults=await Promise.all(missingItems.map(id=>itemRepo.getItemById(id)));
      
      dbResults.forEach((item,i) => {
        itemsData[missingIndices[i]]=item;
        redis.setex("CanteenItem:"+missingItems[i],itemTime,JSON.stringify(item));
      });
    }

    itemsData.forEach((item,index)=>{
      let cartItem=cacheCart.cart[index];
      let {ava,StartingTime,EndingTime}=item;
      
      if(!ava){
        item.code=-1;
        item.message=`Item ID ${cartItem.itemId} is currently unavailable.`;
      }
      
      if(StartingTime&&EndingTime) {
        let startTime=new Date();
        let endTime=new Date();
        
        const [startHour,startMinute]=StartingTime.split(":" ).map(Number);
        const [endHour,endMinute]=EndingTime.split(":" ).map(Number);
        
        startTime.setHours(startHour, startMinute, 0);
        endTime.setHours(endHour, endMinute, 0);
        
        if(currentTime<startTime||currentTime>endTime){
          item.code = 0;
          item.message = `Item ID ${cartItem.itemId} is only available from ${StartingTime} to ${EndingTime}.`;
        }
      }
      cart.push(item);
    });

    let canteenData=await redis.get("CanteenData:"+cacheCart.canteenId);

    if(!canteenData){
      canteenData=await itemRepo.getCanteenDataById(cacheCart.canteenId);
    }else{
      canteenData=JSON.parse(canteenData);
    }

    const obj={
      canteenId:cacheCart.canteenId,
      CanteenName:canteenData.CanteenName,
      Location:canteenData.Location,
      fromTime:canteenData.fromTime,
      ToTime:canteenData.ToTime,
      cart:cart
    };

    return res.json({code:1,message:"Cart Fetched Successfully.",data:obj});
    
  }catch(err){
    return res.json({code:-1,message:"Internal server Error."});
  }
  
}

module.exports={
  addToCart,
  removeFromCart,
  clearCart,
  updateCart,
  getCartItems,
}