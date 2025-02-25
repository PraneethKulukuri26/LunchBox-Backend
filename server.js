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
const UserItemRouter=require('./router/User/itemRouter');
app.use('/api/User/item',verifyToken,UserItemRouter);

//User-cart
const UserCartRouter=require('./router/User/cartRouter');
app.use('/api/User/cart',verifyToken,UserCartRouter);

//explore
const ExploreRouter=require('./router/explore/exploreRouter');
app.use('/api/explore',ExploreRouter);




app.patch("/test",(req,res)=>{

  let obj=req.query.tree;
  let obj2=req.body;
  console.log(obj);
  console.log(obj2);

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
    console.log(file);
  //  if(file.length==0){
  //   throw new 
  //  }
  fs.rmSync('public/'+file.name);
  //console.log(file);
  //throw new Error("Failed tree");
  }catch(err){
    return res.json({code:0,message:err.message});
  }

  // const dir = path.join(__dirname, 'public/images/tree/7878/');
  //   if (!fs.existsSync(dir)) {
  //     fs.mkdirSync(dir, { recursive: true });  // Create directory recursively
  //   }

    

   //image url: http://localhost:5000/images/img1.jpeg

  // for(let i=0;i<file.length;i++){
  //   await file[i].mv('public/images/tree/'+file[i].name);
  // }
  return res.json({code:1});
});


// const conr=require('./Controller/Explore/canteen/canteenController');
// app.get('/test/getData',conr.getCanteens);



// const rter=require('./Controller/User/authController');
// app.get('/test/profile',verifyToken,rter.getProfile);


