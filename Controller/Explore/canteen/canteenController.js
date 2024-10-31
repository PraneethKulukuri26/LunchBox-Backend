const db=require('../../../Config/mysql_db');
const redis=require('../../../Config/redisClint');
const fs=require('fs');
const path=require('path');

async function getCanteens(req,res) {
  try{
    let canteensD=await redis.get('canteens');
    const conn=await db.getConnection();

    if(canteensD){
      canteensD=JSON.parse(canteensD);
    }else{
      const [rows] = await conn.query('SELECT CanteenId FROM Canteen');
      canteensD = rows.map(row => row.CanteenId);
      await redis.setex('canteens',60,JSON.stringify(canteensD));
    }

    const canteenPromises = canteensD.map(async (canteenId) => {
      let canteen = await redis.get(`canteen:${canteenId}`);

      if (!canteen) {
        const [rows] = await conn.query('SELECT BlockPresent, CanteenName, canteen_access, canteen_timings, floorPresent FROM Canteen WHERE CanteenId=?', [canteenId]);
        if (!rows[0]) return null;

        let canteenData = rows[0];
        canteenData.CanteenId = canteenId;
        canteenData.images = [];

        try {
          const directoryPath = path.join(__dirname, "../../../public/images/canteens/" + canteenId + "/canteenImages/");
          const files = fs.readdirSync(directoryPath);
          canteenData.images = files;
        } catch (err) {
          console.log(err.message);
          canteenData.images = [];
        }

        await redis.setex(`canteen:${canteenId}`, 60, JSON.stringify(canteenData));
        return canteenData;

      } else {
        return JSON.parse(canteen);
      }
    });

    const obj = (await Promise.all(canteenPromises)).filter(Boolean);
    conn.release();
    return res.status(200).json({ code: 1, message: 'Data fetched successfully.', Canteens: obj });

  }catch(err){
    console.log(err.message);
    return res.status(501).json({code:-1,message:'Internal server error.'});
  }
}

module.exports={
  getCanteens,
}