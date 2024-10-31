const redis=require('../../Config/redisClint');
const db=require('../../Config/redisClint');
const fs=require('fs');
const path=require('path');
const time=process.env.redis_time;

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

    let cacheCart=await redis.get("UserCart_"+userId);
    let item=await redis.get("CanteenItem:"+id);

    if(!item){
      const conn=await db.getConnection();

      const query='select canteenId, FoodItemId, FoodItemName, Description, Price, Category, AvailableFrom, AvailableTo, Quantity,comTime from FoodItem where FoodItemId=? and availability=true';

      await conn.query(query,[id]).then(async result=>{
        conn.release();
        result=result[0];

        if(!result || result.length==0){
          return res.status(404).json({
            code: 0,
            message: "Item not found."
          });
        }

        try{
          result[0].images=[];
          const directoryPath = path.join(__dirname, "../../../public/images/canteens/"+result[0].canteenId+"/foodImages/"+result[0].FoodItemId+"/");
  
          const files = fs.readdirSync(directoryPath);
          files.forEach(file => {
            result[0].images.push(file);
          });
  
        }catch(err){
          console.log(err.message);
          return res.json({code:0,message:"Internel Server error."});
        }

        await redis.setex("CanteenItem:"+id, time, JSON.stringify(result[0]));
        item=result[0];
      });
    }else{
      item = JSON.parse(item);
    }

    if(cacheCart){
      cacheCart=JSON.parse(cacheCart);

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

    await redis.setex("UserCart_" + userId, 3600, JSON.stringify(cacheCart));

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

    const itemExists = cacheCart.cart.some((item) => item.itemId === itemId);
    if (!itemExists) {
      return res.status(404).json({
        code: 0,
        message: `Item with itemId ${itemId} not found in cart.`,
      });
    }
    
    cacheCart.cart=cacheCart.cart.filter(item=>item.itemId!==itemId);
    if(cacheCart.cart.length==0){
      await redis.del("UserCart_"+userId);
    }else{
      await redis.setex("UserCart_"+userId,3600,JSON.stringify(cacheCart));
    }

    return res.status(200).json({
      code: 1,
      message: "Item successfully removed from the cart."
    });

  }catch(err){
    console.log(err.message);
    return res.status(500).json({code:-1,message:'Internal Server error'});
  }
}

async function clearCart(req,res) {
  try{
    const userId=req.payload.userId;

    let cacheCart=await redis.get("UserCart_"+userId);
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
    const cacheCartItems = new Set(cacheCart.cart.map(it => it.itemId));

    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      
      if (!item.itemId || typeof item.quantity !== 'number') {
          return res.status(400).json({
              code: 0,
              message: `Invalid data.`
          });
      }

      if (item.quantity > 0) {

          if (!cacheCartItems.has(item.itemId)) {
              return res.json({ code: 0, message: `${item.itemId} not found in the cart.` });
          }

          newCart.push(item);
      }
    }

    cacheCart.cart=newCart;

    await redis.setex("UserCart_"+userId,3600,JSON.stringify(cacheCart));

    return res.status(200).json({code:1,message:'Cart Updated Successfully.'});
    
  }catch(err){
    console.error(err.message);
    return res.status(500).json({code:-1,message:'Internal Server error'});
  }

}

async function getCartItems(req,res) {
  try{
    const userId=req.payload.userId;

    let cacheCart=await redis.get("UserCart_"+userId);
    if(!cacheCart){
      return res.status(404).json({code:0,message:"cart data not found."});
    }  

    cacheCart=JSON.parse(cacheCart);
    if(cacheCart.canteenId==-9){
      return res.json({code:0,message:'Cart is empty.'});
    }

    

  }catch(err){
    console.error(err.message);
    return res.status(500).json({code:-1,message:'Internal Server error'});
  }
}

module.exports={
  addToCart,
  removeFromCart,
  clearCart,
  updateCart,
  getCartItems
}