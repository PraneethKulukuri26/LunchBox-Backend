const db=require("../../Config/mysqlDb.js");
const jwt=require("jsonwebtoken");

async function login(req,res) {
  
  const conn= await db.getConnection();
  try{
    const{ CanteenId,Password }=req.body;

    if(!CanteenId || !Password){
      return res.json({
        code:-1,
        message:"Proper infomation needed."
      })
    }

    const query="select * from Canteen where CanteenId=?";

    await conn.query(query,[CanteenId]).then(result=>{
      conn.release();
      result=result[0];

      if(!(result.length>0)){
        return res.status(404).json({
          code:-1,
          message:"Invalid Credentials"
        });
      }

      if(!(Password===result[0].password)){
        return res.json({
          code:0,
          message:"Invalid Password."
        })
      }

      console.log(result[0]);

      const token=jwt.sign({
        CanteenId:result[0].CID,
        role:'admin'
      },process.env.SECRET_KEY,{
        algorithm: "HS512",
        expiresIn: "7d",
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