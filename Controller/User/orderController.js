const redis = require('../../Config/redisClint');
const db = require('../../Config/mysql_DB');
const fs = require('fs').promises;
const path = require('path');

// Function to fetch item details from Redis or MySQL
async function getFoodItemDetails(itemId) {
  let item = await redis.get(`CanteenItem:${itemId}`);

  if (!item) {
    const conn = await db.getConnection();
    try {
      const query = 'SELECT canteenId, FoodItemId, FoodItemName, Description, Price, Category, AvailableFrom, AvailableTo, Quantity, comTime FROM FoodItem WHERE FoodItemId=? AND availability=true';
      const [result] = await conn.query(query, [itemId]);

      if (!result || result.length === 0) return null;

      item = result[0];
      item.images = [];

      const dirPath = path.join(__dirname, `../../public/images/canteens/${item.canteenId}/foodImages/${item.FoodItemId}/`);
      try {
        item.images = await fs.readdir(dirPath);
      } catch (err) {
        console.error("Image fetch error:", err.message);
      }

      await redis.setex(`CanteenItem:${itemId}`, 3600, JSON.stringify(item));
    } catch (err) {
      console.error("DB error:", err.message);
      return null;
    } finally {
      conn.release();
    }
  } else {
    item = JSON.parse(item);
  }

  return item;
}

// Add to Cart
async function addToCart(req, res) {
  try {
    const { id: itemId, quantity } = req.query;
    const userId = req.payload.userId;

    if (!itemId || !quantity) {
      return res.status(400).json({ code: 0, message: "Missing itemId or quantity." });
    }

    let [cacheCart, item] = await Promise.all([
      redis.get(`UserCart_${userId}`),
      getFoodItemDetails(itemId)
    ]);

    if (!item) return res.status(404).json({ code: 0, message: "Item not found." });

    cacheCart = cacheCart ? JSON.parse(cacheCart) : { canteenId: item.canteenId, cart: [] };

    if (cacheCart.canteenId !== item.canteenId) {
      return res.status(409).json({ code: 0, message: "All items must be from the same canteen." });
    }

    if (cacheCart.cart.find(item => item.itemId == itemId)) {
      return res.status(200).json({ code: 1, message: "Item already in cart." });
    }

    cacheCart.cart.push({ itemId, quantity });

    await redis.setex(`UserCart_${userId}`, 300, JSON.stringify(cacheCart));

    return res.status(200).json({ code: 1, message: "Item added to cart successfully." });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ code: -1, message: "Internal Server Error" });
  }
}

// Remove from Cart
async function removeFromCart(req, res) {
  try {
    const itemId = Number(req.query.id);
    const userId = req.payload.userId;

    if (!itemId) return res.status(400).json({ code: 0, message: "ItemId is required." });

    let cacheCart = await redis.get(`UserCart_${userId}`);
    if (!cacheCart) return res.status(404).json({ code: 0, message: "Cart is empty." });

   
