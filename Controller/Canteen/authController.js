const db=require("../../Config/mysqlDb.js");
const jwt=require("jsonwebtoken");

async function login(req,res) {
  try{
    const conn= await db.getConnection();
    
    const{ CanteenName, BlockPresent,floorPresent,password }=req.body;

    if(!CanteenName || !BlockPresent || !floorPresent || !password){
      return res.json({
        code:-1,
        message:"Proper infomation needed."
      })
    }

    const query="select CanteenId,password from Canteen where CanteenName=? and BlockPresent=? and floorPresent=?";

    await conn.query(query,[CanteenName,BlockPresent,floorPresent]).then(result=>{
      conn.release();
      result=result[0];

      if(!(result.length>0)){
        return res.status(404).json({
          code:-1,
          message:"Invalid Credentials"
        });
      }

      if(!(password===result[0].password)){
        return res.json({
          code:0,
          message:"Invalid Password."
        })
      }

      console.log(result[0]);

      const token=jwt.sign({
        CanteenId:result[0].CanteenId,
        role:'admin'
      },process.env.SECRET_KEY,{
        algorithm: "HS512",
        expiresIn: "2d",
      });

      return res.status(200).json({
        code:1,
        message:"Login Successfull",
        token:token
      });


    }).catch(err=>{
      conn.release();
      console.log(err);
      return res.json({
        code:0,
        message:"failed to load data"
      })
    });
  }catch(err){
    return res.status(501).json({
      code:-1,
      message:"Unable to load data"
    });
  }
}

module.exports={
  login
}