  const { measureMemory } = require("vm");
  const db=require("../../Config/mysql_DB");
  const { checkIsAdmin } = require("./helper");
  const fs=require('fs');
  const path=require('path');

  async function CanteengetItems(req,res){
    try{
      const CanteenId=req.payload.CanteenId;

      if(!req.payload.role==='admin'){
        return res.json({code:-1,message:'Invalid Token.'});
      }

      const query='select * from FoodItem where CanteenId= ?';
      const conn=await db.getConnection();

      await conn.query(query,[CanteenId]).then(result=>{
        conn.release();
        result=result[0];

        if(!result || result.length==0){
          return res.json({code:1,message:"NO items."});
        }
        

        for(let i=0;i<result.length;i++){
          result[i].images=[];
          try{
              const directoryPath = path.join(__dirname, "../../public/images/canteens/"+CanteenId+"/foodImages/"+result[i].FoodItemId+"/");

              const files = fs.readdirSync(directoryPath);
              files.forEach(file => {
                result[i].images.push(file);
                console.log(file);
              });
    
            }catch(err){
              console.log(err.message);
              return res.json({code:0,message:"Unable to fetch item images."});
            }
        }

        return res.json({
          code:1,
          message:"Items fetched Successfully",
          data:result,
        })

      }).catch((err)=>{
        conn.release();
        console.log("itemController->getItems err: "+err.message);
        return res.json({
          code:0,
          message:"Unable to fetch data."
        });
      });
    }catch(err){
      console.log("Failed to get items: "+err.message);
      return res.json({code:-1,message:"Failed to get items"});
    }
  }


  async function deleteItem(req,res) { 

    try{
      const itemId=req.query.id;
      const CanteenId=req.payload.CanteenId;
      //console.log(CanteenId);

      const conn=await db.getConnection();
      const query='delete from FoodItem where FoodItemId=? and CanteenId=?';

      await conn.query(query,[itemId,CanteenId]).then((result)=>{
        conn.release();

        if(result[0].affectedRows>0){

          const dir=path.join(__dirname,"../../public/images/canteens/"+CanteenId+"/foodImages/"+itemId+"/");

          try {
            fs.rmSync(dir, { recursive: true, force: true });
            console.log(`Folder for FoodItemId ${itemId} deleted successfully.`);
          } catch (err) {
            console.error("Error deleting FoodItemId folder: ", err.message);
          }

          return res.json({
            code:1,
            message:'Item removed.'
          });
        }else{
          return res.json({
            code:0,
            message:'Item not removed.'
          })
        }
      }).catch(err=>{
        conn.release();
        console.log(err.message);
        return res.json({
          code:0,
          message:'Unable to delete.'
        })
      });
    }catch(err){
      console.log(err.message);
      return res.json({
        code:-1,
        message:'Something wrong'
      })
    }
  }

  async function updateItem(req,res) {
    try{
      const itemId=req.query.id;
      const CanteenId=req.payload.CanteenId;
      const {Description,Price,Category,AvailableFrom,AvailableTo,availability,Quantity}=req.body;

      if(!Description || !Category || isNaN(Price) || isNaN(Quantity)){
        return res.json({
          code:0,message:'Invalid data.'
        });
      }

      const query='update FoodItem set Description = ? , Price = ? , Category = ? , AvailableFrom = ? , AvailableTo = ? , availability = ? , Quantity = ? where itemId = ? and CanteenId = ?';
      const conn=await db.getConnection();
      await conn.query(query,[Description,Price,Category,AvailableFrom,AvailableTo,availability,Quantity,itemId,CanteenId])
      .then(result=>{
        conn.release();

        if(!(result[0].affectedRows>0)){
          return res.json({code:0,message:'Item Not Updated'});
        }

        return res.json({code:1,message:'Items Updated'});

      }).catch(err=>{
        conn.release();
        console.log(err.message);
        return res.json({code:0,message:'Failed to update'});
      });

    }catch(err){
      console.log(err.message);
      return res.json({
        code:-1,
        message:'Failed to update data.'
      })
    }
  }

  async function addItem(req,res) {

    try{

      const CanteenId=req.payload.CanteenId;
      let images,jsonData;
      try{
        images=req.files.images;

        if (!Array.isArray(images)) {
          images=[images]; 
        }

        if(!images || images.length==0){
          throw new Error("no images provided.");
        }

        for(let i=0;i<images.length;i++){
          if(!(images[i].mimetype=='image/png' || images[i].mimetype=='image/jpeg')){
            throw new Error("file format not accesspted.");
          }
        }

      }catch(err){
        console.log(err);
        return res.json({code:0,message:err.message});
      }

      try{
        jsonData=JSON.parse(req.body.json);
      }catch(err){
        console.log(err.message);
        return res.json({code:0,message:err.message});
      }

      let { FoodItemName, Description = "", Price, Category = "veg", AvailableFrom = "9:00", AvailableTo = "17:30", Quantity = 30, availability = true } = jsonData;
      
      if(!FoodItemName || !Price || isNaN(Price)){
        return res.json({
          code:0,
          message:'Invalid Data'
        })
      }

      const conn=await db.getConnection();
      const query='insert into FoodItem (canteenId,FoodItemName,Description,Price,Category,AvailableFrom,AvailableTo,Quantity,availability) values(?,?,?,?,?,?,?,?,?)';

      await conn.query(query,[CanteenId,FoodItemName,Description,Price,Category,AvailableFrom,AvailableTo,Quantity,availability])
      .then(async result=>{
        conn.release();

        if(result[0].affectedRows>0){
          
          const dir = path.join(__dirname,'../../public/images/canteens/'+CanteenId+'/foodImages/'+result[0].insertId+'/');
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });  // Create directory recursively
          }

          for(let i=0;i<images.length;i++){
            await images[i].mv('public/images/canteens/'+CanteenId+'/foodImages/'+result[0].insertId+'/'+images[i].name);
          }

          return res.status(200).json({
            code:1,message:'Item added.'
          });
        }else{
          return res.status(200).json({
            code:0,message:'Item not added.'
          });
        }

      }).catch(err=>{
        conn.release();
        console.log(err.message);
        return res.json({
          code:0,
          message:'Data not added.'
        })
      });
      
    }catch(err){
      console.log(err);
      return res.json({code:-1,message:'Not able to add Item.'});
    }
    
  }


  module.exports={
    CanteengetItems,
    deleteItem,
    updateItem,
    addItem
  }