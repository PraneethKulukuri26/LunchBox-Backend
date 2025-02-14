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
  try{
    const userId=req.payload.userId;
    const conn=await db.getConnection();

    let cacheCart=await redis.get("UserCart_"+userId);
    if(!cacheCart){
      return res.status(404).json({code:0,message:"cart data not found."});
    }  

    cacheCart=JSON.parse(cacheCart);
    if(cacheCart.canteenId==-9 || cacheCart.cart.length==0){
      return res.json({code:0,message:'Cart is empty.'});
    }

    let cartObj={};
    let canteen = await redis.get(`canteen:${cacheCart.canteenId}`);

    if(!canteen){
      const [rows] = await conn.query('SELECT BlockPresent, CanteenName, canteen_access, canteen_timings, floorPresent FROM Canteen WHERE CanteenId=?', [cacheCart.canteenId]);

      canteen = rows[0];
      canteen.CanteenId = cacheCart.canteenId;
      canteen.images = [];

        try {
          const directoryPath = path.join(__dirname, "../../../public/images/canteens/" + cacheCart.canteenId + "/canteenImages/");
          const files =await fs.readdir(directoryPath);
          canteen.images = files;
        } catch (err) {
          console.log(err.message);
          canteen.images = [];
        }

        await redis.setex(`canteen:${cacheCart.canteenId}`, 60, JSON.stringify(canteen));
    }else{
      canteen=JSON.parse(canteen);
    }

    cartObj = {
      canteenId: canteen.CanteenId,
      canteenName: canteen.CanteenName,
      floor: canteen.floorPresent,
      block: canteen.BlockPresent,
      cart: []
    };  

    // for(let i=0;i<cacheCart.cart.length;i++){
    //   const item=redis.get("CanteenItem:" + cacheCart.cart[i].itemId);

    //   if(!item){
    //     try{
    //       const query = 'SELECT canteenId, FoodItemId, FoodItemName, Description, Price, Category, AvailableFrom, AvailableTo, Quantity, comTime FROM FoodItem WHERE FoodItemId=? AND availability=true';
    //       const [rows] = await conn.query(query, [item.itemId]);
  
    //       if (!rows || rows.length === 0) {
    //         return res.json({ code: 1, message: "Item fetched Successfully", data: {} });
    //       }
  
    //       let result = rows[0];
  
    //       try {
    //         const directoryPath = path.join(__dirname, "../../../public/images/canteens/" + result.canteenId + "/foodImages/" + result.FoodItemId + "/");
    //         const files = await fs.readdir(directoryPath);
    //         result.images = files;
    //       } catch (err) {
    //         console.log(err.message);
    //         result.images = [];
    //       }
  
    //       await redis.setex("CanteenItem:" + id, 60, JSON.stringify(result));
    //       item=result;
    //     }catch(err){
    //       return res.json({code:0,message:'Error while fetching cart.'});
    //     }
    //     finally{
    //       conn.release();
    //     }
    //   }else{
    //     item=JSON.parse(item);
    //   }

    //   obj={
    //     itemId:item.FoodItemId,
    //     quantity:cacheCart.cart[i].quantity,
    //     time:item.comTime,
    //     cost:item.Price,
    //     name:item.FoodItemName,
    //     img:item.images,
    //   };

    //   if(cacheCart.cart[i].quantity<=item.Quantity){
    //     obj.available=true;
    //     obj.message='Item stock is avalaible.'
    //   }else{
    //     obj.available=false;
    //     obj.message=`Only ${item.Quantity} avaluble.`;
    //   }

    //   cartObj.cart.push(obj);

    // }

    const itemIds = cacheCart.cart.map((item) => `CanteenItem:${item.itemId}`);
    const cachedItems = await redis.mget(itemIds);

    for (let i = 0; i < cacheCart.cart.length; i++) {
      let item = cachedItems[i] ? JSON.parse(cachedItems[i]) : null;

      if (!item) {
        try {
          const query = 'SELECT canteenId, FoodItemId, FoodItemName, Description, Price, Category, AvailableFrom, AvailableTo, Quantity, comTime FROM FoodItem WHERE FoodItemId=? AND availability=true';
          const [rows] = await conn.query(query, [cacheCart.cart[i].itemId]);

          if (!rows || rows.length === 0) {
            continue;
          }

          item = rows[0];
          try {
            const directoryPath = path.join(__dirname, "../../../public/images/canteens/" + item.canteenId + "/foodImages/" + item.FoodItemId + "/");
            item.images = await fs.readdir(directoryPath);
          } catch (err) {
            console.log(err.message);
            item.images = [];
          }

          await redis.setex("CanteenItem:" + cacheCart.cart[i].itemId, 60, JSON.stringify(item));
        } catch (err) {
          return res.status(500).json({ code: 0, message: 'Error while fetching cart.' });
        }
      }

      const obj = {
        itemId: item.FoodItemId,
        quantity: cacheCart.cart[i].quantity,
        time: item.comTime,
        cost: item.Price,
        name: item.FoodItemName,
        img: item.images,
        available: cacheCart.cart[i].quantity <= item.Quantity,
        message: cacheCart.cart[i].quantity <= item.Quantity
          ? 'Item stock is available.'
          : `Only ${item.Quantity} available.`
      };

      cartObj.cart.push(obj);

    }
    
    await conn.release();
    return res.status(200).json({ code: 1, message: 'Cart Items fetched successfully.', data: cartObj });

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
  getCartItems,
}