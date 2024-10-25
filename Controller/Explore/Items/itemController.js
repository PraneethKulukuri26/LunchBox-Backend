const db=require('../../../Config/mysql_DB');

async function getItemsByCanteen(req,res) {
  try{
    const canteenId=req.query.canteenId;

    if(!canteenId){
      return res.json({code:0,message:'Invalid data.'});
    }

    const conn=await db.getConnection();
    const query='select canteenId, FoodItemId, FoodItemName, Description, Price, img, Category, AvailableFrom, AvailableTo, Quantity from FoodItem where canteenId=? and availability=true';

    await conn.query(query,[canteenId]).then(result=>{
      conn.release();
      result=result[0];

      return res.json({code:1,message:'Items Fetched Successfully',data:result});
    }).catch(err=>{
      conn.release();
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

    const conn=await db.getConnection();
    const query='select canteenId, FoodItemId, FoodItemName, Description, Price, img, Category, AvailableFrom, AvailableTo, Quantity from FoodItem where FoodItemId=? and availability=true';
    
    await conn.query(query,[id]).then(result=>{
      conn.release();
      result=result[0];

      return res.json({code:1,message:'Item Fetched Successfully',data:result[0]});
    }).catch(err=>{
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