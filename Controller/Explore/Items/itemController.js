const db=require('../../../Config/mysql_DB');
const redis=require('../../../Config/redisClint');
const fs=require('fs');
const path=require('path');
const time=process.env.redis_time;

async function getItemsByCanteen(req,res) {
  try{
    const canteenId=req.query.canteenId;

    if(!canteenId){
      return res.json({code:0,message:'Invalid data.'});
    }

    let cacheItem=await redis.get("Canteens");
    let itemList=[];
    if(cacheItem){
      cacheItem=JSON.parse(cacheItem);
      console.log(cacheItem);
      const itemIds=cacheItem.find(canteen=>canteen.canteenId===canteenId);
      if(itemIds){
        for(let i=0;i<itemIds.itemsId.length;i++){
          cacheItem=await redis.get("CanteenItem:" + itemIds.itemsId[i]);

          if (cacheItem) {
            itemList.push(JSON.parse(cacheItem));
          }
        }
      }
    }

    if(itemList.length!=0){
      console.log("cache hit");
      return res.json({code:1,message:'Items Fetched Successfully',data:itemList});
    }

    console.log("cache miss");


    const conn=await db.getConnection();
    const query='select canteenId, FoodItemId, FoodItemName, Description, Price, Category, AvailableFrom, AvailableTo, Quantity from FoodItem where canteenId=? and availability=true';

    await conn.query(query,[canteenId]).then(async result=>{
      conn.release();
      result=result[0];

      if(!result || result.length==0){
        return res.json({code:1,message:"Items fetched Successfully",data:[]});
      }

      let itemsIds=[];

      for(let i=0;i<result.length;i++){
        result[i].images=[];
        try{
            const directoryPath = path.join(__dirname, "../../../public/images/canteens/"+canteenId+"/foodImages/"+result[i].FoodItemId+"/");

            const files = fs.readdirSync(directoryPath);
            files.forEach(file => {
              result[i].images.push(file);
            });

            itemsIds.push(result[i].FoodItemId);

            await redis.setex("CanteenItem:"+result[i].FoodItemId, time, JSON.stringify(result[i]));
  
          }catch(err){
            console.log(err.message);
            return res.json({code:0,message:"Unable to fetch item images."});
          }
      }

      const canteenObj={
        canteenId:canteenId,
        itemsId:itemsIds
      };

      cacheItem=JSON.parse(cacheItem);

      if (!Array.isArray(cacheItem)) {
        cacheItem=[];
      }

      cacheItem.push(canteenObj);

      await redis.setex("Canteens", time, JSON.stringify(cacheItem));



      return res.json({code:1,message:'Items Fetched Successfully',data:result});
    }).catch(err=>{
      conn.release();
      console.log(err.message);
      return res.json({code:0,message:'Failed to fetch data.'});
    });
    
  }catch(err){
    return res.json({code:-1,message:'Internal server error.'});
  }
  
}

async function getItemById(req,res) {
  try{
    const id=req.query.id;

    if(!id){
      return res.json({code:0,message:'Invalid data.'});
    }

    let cacheItem=await redis.get("CanteenItem:"+id);
    if(cacheItem){
      console.log("Returning cashed menu.");
      return res.json({code:1,message:'Item Fetched Successfully',data:JSON.parse(cacheItem)});
    }

    console.log("cache miss.");

    const conn=await db.getConnection();
    const query='select canteenId, FoodItemId, FoodItemName, Description, Price, Category, AvailableFrom, AvailableTo, Quantity from FoodItem where FoodItemId=? and availability=true';
    
    await conn.query(query,[id]).then(async result=>{
      conn.release();
      result=result[0];

      if(!result || result.length==0){
        return res.json({code:1,message:"Item fetched Successfully",data:{}});
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
        return res.json({code:0,message:"Unable to fetch item images."});
      }

      await redis.setex("CanteenItem:"+id, time, JSON.stringify(result[0]));

      return res.json({code:1,message:'Item Fetched Successfully',data:result[0]});
    }).catch(err=>{
      console.log(err.message);
      return res.json({code:0,message:'Failed to fetch data.'});
    })

  }catch(err){
    return res.json({code:-1,message:'Internal server error.'});
  }
}

async function getCanteens(req,res) {
  try{
    
  }catch(err){
    return res.json({code:-1,message:'Internal server error.'});
  }
}

module.exports={
  getItemsByCanteen,
  getItemById
}