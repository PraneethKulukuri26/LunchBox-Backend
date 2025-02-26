  const { measureMemory } = require("vm");
  const db=require("../../Config/mysqlDb.js");
  const { checkIsAdmin } = require("./helper");
  const fs=require('fs');
  const path=require('path');
  const { json } = require("body-parser");
  const itemRepo=require('../../Services/itemsServices/itemsCRUD.js');

  async function CanteengetItems(req,res){
    try{
      const CanteenId=req.payload.CanteenId;

      if(!req.payload.role==='admin'){
        return res.json({code:-1,message:'Invalid Token.'});
      }



      // const query='select * from FoodItem where CanteenId= ?';
      // const conn=await db.getConnection();

      // await conn.query(query,[CanteenId]).then(result=>{
      //   conn.release();
      //   result=result[0];

      //   if(!result || result.length==0){
      //     return res.json({code:1,message:"Items fetched Successfully",data:[]});
      //   }
        

      //   for(let i=0;i<result.length;i++){
      //     result[i].images=[];
      //     try{
      //         const directoryPath = path.join(__dirname, "../../public/images/canteens/"+CanteenId+"/foodImages/"+result[i].FoodItemId+"/");

      //         const files = fs.readdirSync(directoryPath);
      //         files.forEach(file => {
      //           result[i].images.push(file);
      //           console.log(file);
      //         });
    
      //       }catch(err){
      //         console.log(err.message);
      //         return res.json({code:0,message:"Unable to fetch item images."});
      //       }
            
      //   }

      //   return res.json({
      //     code:1,
      //     message:"Items fetched Successfully",
      //     data:result,
      //   })

      // }).catch((err)=>{
      //   conn.release();
      //   console.log("itemController->getItems err: "+err.message);
      //   return res.json({
      //     code:0,
      //     message:"Unable to fetch data."
      //   });
      // });
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

  async function updateItemData(req,res) {
    try{
      const itemId=req.query.id;

      if(!itemId){
        return res.json({code:0,message:'Please provide itemId.'});
      }

      const CanteenId=req.payload.CanteenId;
      const { Description, Price, Category, AvailableFrom, AvailableTo, availability, Quantity } = req.body;

      let updates = [];
      let values = [];

      if (Description) {
        updates.push("Description = ?");
        values.push(Description);
      }
      if (Price) {
        updates.push("Price = ?");
        values.push(Price);
      }
      if (Category) {
        updates.push("Category = ?");
        values.push(Category);
      }
      if (AvailableFrom) {
        updates.push("AvailableFrom = ?");
        values.push(AvailableFrom);
      }
      if (AvailableTo) {
        updates.push("AvailableTo = ?");
        values.push(AvailableTo);
      }
      if (availability) {
        updates.push("availability = ?");
        values.push(availability);
      }
      if (Quantity) {
        updates.push("Quantity = ?");
        values.push(Quantity);
      }

      if (updates.length === 0) {
        return res.status(400).json({codw:0, message: "No fields to update" });
      }

      values.push(itemId);
      values.push(CanteenId);

      const query=`update FoodItem set ${updates.join(', ')} where itemId = ? and CanteenId = ?`;
      const conn=await db.getConnection();
      await conn.query(query,values)
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

  async function updateItemImages(req,res) {

    try{
      let newImages=[];
      let removedImages=[];
      const CanteenId=req.payload.CanteenId;
      const itemId=req.query.id;

      try{
        newImages=req.files.new_images;

        if (!Array.isArray(newImages)) {
          newImages=[newImages];
        }

        if(!newImages || newImages.length==0){
          throw new Error("no new images provided.");
        }

        for(let i=0;i<newImages.length;i++){
          if(!(newImages[i].mimetype=='image/png' || newImages[i].mimetype=='image/jpeg')){
            throw new Error("file format not accesspted.");
          }
        }

      }catch(err){
        newImages=[];
        console.log(err.message);
      }

      try{
        removedImages=JSON.parse(req.body.removed_images);
        removedImages=removedImages.images;

        if (!Array.isArray(removedImages)) {
          removedImages=[removedImages];
        }
      }catch(err){
        removedImages=[];
        console.log(err.message);
      }

      if(newImages.length==0 && removedImages.length==0){
        return res.json({code:0,message:"no images provided."});
      }

      if(newImages.length!=0){
        for(let i=0;i<newImages.length;i++){
          await newImages[i].mv('public/images/canteens/'+CanteenId+'/foodImages/'+itemId+'/'+newImages[i].name);
        }
      }

      if(removedImages.length!=0){
        
        let cou=0;
        try{
          const directoryPath = path.join(__dirname, "../../public/images/canteens/"+CanteenId+"/foodImages/"+itemId+"/");

          const files = fs.readdirSync(directoryPath);
          cou=files.length;

        }catch(err){
          console.log(err.message);
          return res.json({code:0,message:"Unable to delete items."});
        }

        if(cou==0){
          return res.json({code:0,message:"Images are not there for this item."});
        }else if(removedImages.length==cou){
          return res.json({code:0,message:"Can not remove all the images."});
        }

        for(let i=0;i<removedImages.length;i++){
          try{
            fs.rmSync('public/images/canteens/'+CanteenId+'/foodImages/'+itemId+'/'+removedImages[i]);
          }catch(err){
            console.log(err.message);
          }
        }
      }

      return res.json({code:1,message:"Updates on Images executed."});

    }catch(err){
      console.log(err);
      return res/json({code:-1,message:err.message});
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

        if(!(images[0].mimetype=='image/png' || images[0].mimetype=='image/jpeg')){
          throw new Error("file format not accesspted.");
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

      jsonData.canteenId=CanteenId;
      await itemRepo.addItem(jsonData,images[0]);

      return res.json({code:1,message:"Item Added"});

      // let { FoodItemName, Description = "", Price, Category = "veg", AvailableFrom = "9:00", AvailableTo = "17:30", Quantity = 30, availability = true } = jsonData;
      
      // if(!FoodItemName || !Price || isNaN(Price)){
      //   return res.json({
      //     code:0,
      //     message:'Invalid Data'
      //   })
      // }

      // const conn=await db.getConnection();
      // const query='insert into FoodItem (canteenId,FoodItemName,Description,Price,Category,AvailableFrom,AvailableTo,Quantity,availability) values(?,?,?,?,?,?,?,?,?)';

      // await conn.query(query,[CanteenId,FoodItemName,Description,Price,Category,AvailableFrom,AvailableTo,Quantity,availability])
      // .then(async result=>{
      //   conn.release();

      //   if(result[0].affectedRows>0){
          
      //     const dir = path.join(__dirname,'../../public/images/canteens/'+CanteenId+'/foodImages/'+result[0].insertId+'/');
      //     if (!fs.existsSync(dir)) {
      //       fs.mkdirSync(dir, { recursive: true });
      //     }

      //     for(let i=0;i<images.length;i++){
      //       await images[i].mv('public/images/canteens/'+CanteenId+'/foodImages/'+result[0].insertId+'/'+images[i].name);
      //     }

      //     return res.status(200).json({
      //       code:1,message:'Item added.'
      //     });
      //   }else{
      //     return res.status(200).json({
      //       code:0,message:'Item not added.'
      //     });
      //   }

      // }).catch(err=>{
      //   conn.release();
      //   console.log(err.message);
      //   return res.json({
      //     code:0,
      //     message:'Data not added.'
      //   })
      // });
      
    }catch(err){
      console.log(err);
      return res.json({code:-1,message:'Not able to add Item.'});
    }
    
  }


  module.exports={
    CanteengetItems,
    deleteItem,
    updateItemData,
    addItem,
    updateItemImages
  }