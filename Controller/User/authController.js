const db=require("../../Config/mysql_DB");
const mailSender=require('../../Services/mailSender');
const jwt=require("jsonwebtoken");
const bcrypt=require('bcrypt');
const { strictTransportSecurity } = require("helmet");
const redis=require('../../Config/redisClint');
const e = require("express");
const { json } = require("body-parser");

async function sendEmailReg(req,res) {
  try{
    const {email}=req.body;
    
    if(!email){
      return res.json({
        code:0,
        message:'Invalid Data.'
      })
    }

    const conn=await db.getConnection();
    let userExistResult=await conn.query("select exists( select 1 from User where Email=?) as emailExist",[email]);
    userExistResult=userExistResult[0];
    if(userExistResult[0].emailExist==1){
      conn.release();
      return res.json({code:0,message:'Email already exists.'});
    }

    conn.release();

    const otp=Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp=await bcrypt.hash(otp,10);
    
    await redis.set("OTP:"+email, hashedOtp);

    const result=await mailSender.sendMailForRegister({email:email,otp:otp});

    if(result==1){
      await redis.expire("OTP:"+email,300);
      return res.json({code:1,message:'OTP Sent Successfully.'});
    }else{
      await redis.del("OTP:"+email);
      return res.json({code:0,message:'Failed to send Otp.'})
    }

    //console.log(hashedOtp);
    /*await conn.query("insert into OtpTable (email,otp,created_at) values(?,?,now())",[email,hashedOtp]);

    const result=await mailSender.sendMailForRegister({email:email,otp:otp});

    if(result==1){
      conn.release();
      return res.json({code:1,message:'OTP Sent Successfully.'});
    }else{
      await conn.query("delete from OtpTable where email=? and otp=?",[email,otp]);
      conn.release();
      return res.json({code:0,message:'Failed to send Otp.'})
    }*/
  }catch(err){
    console.log("Error in triggering otp: "+err);
    return res.json({ code: -1, message: "Internal server error" });
  } 
}

async function verifyOtp(req,res) {
  try{
    const {email,otp,purpose} =req.body;

    if(!email || !otp || !purpose || !(purpose=='register' || purpose=='resetPassword')){
      return res.json({code:0,message:'Invalid Data.'});
    }

    const otpCache=await redis.get("OTP:"+email);

    if(!otpCache){
      return res.json({code:0,message:"OTP has expired. Please request a new one."});
    }

    const isValid=await bcrypt.compare(otp,otpCache);
    if(isValid){
      const token=jwt.sign({
          email:email,
          purpose:purpose
        },process.env.SECRET_KEY,{
          algorithm: "HS512",
          expiresIn: "10m",
        });
      
      //await redis.del("OTP:"+email);  
      return res.json({ code: 1, message: "OTP verified successfully",token:token, warrning:'This Token valid for only 10 minutes.'});
    }else{
      return res.json({code:0,message:'Incorrect Otp'});
    }

    // const conn=await db.getConnection();
    // await conn.query("select otp from OtpTable where email = ? and created_at >= NOW() - INTERVAL 5 MINUTE ORDER BY created_at DESC LIMIT 1",[email])
    // .then(async (result)=>{
    //   if(result[0].length>0){
    //     result=result[0];
    //     console.log(result[0].otp);
    //     const isValid=await bcrypt.compare(otp,result[0].otp);
    //     console.log(isValid);
    //     if(isValid){
    //       await conn.query('delete from OtpTable where email=?',[email]);
    //       conn.release();

    //       const token=jwt.sign({
    //         email:email,
    //         purpose:purpose
    //       },process.env.SECRET_KEY,{
    //         algorithm: "HS512",
    //         expiresIn: "10m",
    //       });

    //       return res.json({ code: 1, message: "OTP verified successfully",token:token, warrning:'This Token valid for only 10 minutes.'});
    //     }else{
    //       conn.release();
    //       return res.json({code:0,message:'Incorrect Otp'});
    //     }
    //   }else{
    //     return res.json({ code: 0, message: "OTP expired" });
    //   }
    // });
  }catch(err){
    console.log(err);
    return res.json({ code: -1, message: "Internal server error" });
  }
}

async function registerUser(req,res) {
  try{
    const {name,email,phoneNo,studentId,role,DayOrHos,EmpId,password}=req.body;

    if(!name || !email || !phoneNo || !role || !DayOrHos || !password || ((role==='staff' && !EmpId) || (role==='student' && !studentId))){
      return res.json({code:0,message:'Invalid data.'});
    }

    if(req.payload.email!=email || req.payload.purpose!='register'){
      return res.json({code:0,message:'Cannot register password.'});
    }

    const conn=await db.getConnection();
    let query='';
    let values=[];

    if(role=='staff'){
      query='insert into User (Name,Email,PhoneNo,role,DayOrHos,EmpId,password) values(?,?,?,?,?,?,?)';
      values=[name,email,phoneNo,role,DayOrHos,EmpId,password];
    }else{
      query='insert into User (Name,Email,PhoneNo,role,DayOrHos,StudentId,password) values(?,?,?,?,?,?,?)';
      values=[name,email,phoneNo,role,DayOrHos,studentId,password];
    }

    await conn.query(query,values).then(result=>{
      conn.release();
      if(result[0].affectedRows>0){
        return res.json({code:1,message:'Successfully Registered.'});
      }else{
        return res.json({code:0,message:'Failed to Register.'});
      }
    }).catch(err=>{
      conn.release();
      console.log(err);
      return res.json({code:-1,message:'Problem while inserting Data.'});
    });

  }catch(err){
    return res.json({ code: -1, message: "Internal server error" });
  }
}


async function login(req,res) {

  try{
    const {email,password} = req.body;
    if(!email || !password){
      return res.json({code:0,message:'Invalid data'});
    }

    const conn = await db.getConnection();
    await conn.query('select userId,StudentId,role,password from User where email=?',[email])
    .then(result=>{
      conn.release();
      result=result[0];
      if(result.length>0){
        if(result[0].password==password){

          const token=jwt.sign({
            userId:result[0].userId,
            role:result[0].role,
          },process.env.SECRET_KEY,{
            algorithm: "HS512",
            expiresIn: "7d",
          });

          return res.json({code:1,message:"Login in Successfully.",token:token});
        }else{
          return res.json({code:0,message:'Incorrect Password'});
        }
      }else{
        return res.json({code:0,message:'Email not found.'});
      }
    }).catch(err=>{
      conn.release();
      return res.json({code:-1,message:'Not abul to retrive data.'});
    });


  }catch(err){
    console.log(err);
    return res.json({code:-1,message:'Internal server error.'});
  }
  
}


async function sendEmailForResetPassword(req,res) {
  try{
    const {email} =req.body;

    if(!email){
      return res.json({code:0,message:"Invalid data."});
    }

    const conn=await db.getConnection();

    let userExistResult=await conn.query("select exists( select 1 from User where Email=?) as emailExist",[email]);
    userExistResult=userExistResult[0];
    conn.release();
    if(userExistResult[0].emailExist==0){
      return res.json({code:0,message:'Email does not found.'});
    }


    const otp=Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp=""+await bcrypt.hash(otp,10);
    //await conn.query("insert into OtpTable (email,otp,created_at) values(?,?,now())",[email,hashedOtp]);
    await redis.set("OTP:"+email, hashedOtp);
    const result=await mailSender.sendMailForReset({email:email,otp:otp});

    if(result==1){
      await redis.expire("OTP:"+email,300);
      return res.json({code:1,message:'OTP Sent Successfully.'});
    }else{
      // await conn.query("delete from OtpTable where email=? and otp=?",[email,otp]);
      // conn.release();
      await redis.del("OTP:"+email);
      return res.json({code:0,message:'Failed to send Otp.'})
    }


  }catch(err){
    console.log("Error in triggering otp: "+err);
    return res.json({ code: -1, message: "Internal server error" });
  }
}

async function resetPassword(req,res) {
  try{
    const{email,password} =req.body;
    if(!email || !password){
      return res.json({code:0,message:'Invalid Data'});
    }

    if(req.payload.email!=email || req.payload.purpose!='resetPassword'){
      return res.json({code:0,message:'Cannot reset password.'});
    }

    const conn=await db.getConnection();
    await conn.query('update User set password=? where email=?',[password,email]).then(result=>{

      conn.release();

      if(!(result[0].affectedRows>0)){
        return res.json({code:0,message:'Password not Reseted.'});
      }

      return res.json({code:1,message:'Password Reseted successfully.'});

    }).catch(err=>{
      conn.release();
      console.log("Error:"+err);
      return res.json({code:-1,message:'Failed to update password.'});
    });

  }catch(err){
    return res.json({code:-1,message:'Internal server error.'});
  }
}

async function getProfile(req,res) {
  try{
    const userId=req.payload.userId;
    console.log(userId);

    const conn=await db.getConnection();

    conn.query('select * from User where userId=?',[userId])
    .then(result=>{
      conn.release();
      return res.json({code:-1,data:result[0]});
    }).catch(err=>{
      console.log(err.message);
      return res.json({code:0,message:'Error while fetching user data.'});
    });

    //return res.json({code:-1});

  }catch(err){
    return res.json({code:-1,message:"Error"});
  }  
}


async function test(req,res) {
  try{
    return res.json({data:req.payload});
  }catch(err){
    return res.json({data:""});
  }
}




module.exports={
  registerUser,
  sendEmailReg,
  verifyOtp,
  login,
  sendEmailForResetPassword,
  resetPassword,
  test,
  getProfile
  
}