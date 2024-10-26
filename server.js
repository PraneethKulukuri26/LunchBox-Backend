const express=require("express");
const helmet = require("helmet");
const dotenv=require("dotenv");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const compression = require("compression");
const fileUpload = require("express-fileupload");
const fs=require("fs");
const path=require('path');

dotenv.config();

const app=express();

//Middle ware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(fileUpload());


const verifyToken=require("./MiddleWare/verifyUserToken");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });


//admin-login
const CanteenAuthRouter=require('./router/Canteen/authRounter')
app.use('/api/Canteen/auth',CanteenAuthRouter);


//admin-items
const CanteenItemRouter=require("./router/Canteen/itemRouter")
app.use('/api/Canteen/item',verifyToken,CanteenItemRouter);



//User-auth
const UserAuthRouter=require('./router/User/authRouter');
app.use('/api/User/auth',UserAuthRouter);

//User-items
const UserItemRouer=require('./router/User/itemRouter');
app.use('/api/User/item',verifyToken,UserAuthRouter);

//explore
const ExploreRouter=require('./router/explore/exploreRouter');
app.use('/api/explore',ExploreRouter);




app.get("/test",(req,res)=>{
    res.json({code:17 , message: 'Test Api' , data: [
          {
            name: 'Praneeth',
            id: '2300090274',
            list: [9 , 9 , 9]
          }
      ]})
});


app.post('/test/files/',async (req,res)=>{
  try{
    const file=req.files.img;
  //  if(file.length==0){
  //   throw new 
  //  }
  console.log(file);
  throw new Error("Failed tree");
  }catch(err){
    return res.json({code:0,message:err.message});
  }

  // const dir = path.join(__dirname, 'public/images/tree/7878/');
  //   if (!fs.existsSync(dir)) {
  //     fs.mkdirSync(dir, { recursive: true });  // Create directory recursively
  //   }

  //  await file[0].mv('public/images/'+file[0].name);

   //image url: http://localhost:5000/images/img1.jpeg

  // for(let i=0;i<file.length;i++){
  //   await file[i].mv('public/images/tree/'+file[i].name);
  // }
  return res.json({code:1});
});



app.post('/test/postData',async(req,res)=>{
  obj=JSON.parse(req.body.json);
  //console.log(obj);
  return res.json({code:1});
  
});


