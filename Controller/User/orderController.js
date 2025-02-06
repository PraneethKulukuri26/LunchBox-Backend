// orderPlaced.js
const db = require('./db');  // MySQL database connection

// Function to save order to the database
async function placeOrderInDatabase(user_id, items, order_time) {
  try {
    let totalPrice = 0.00;
    const orderId = require('uuid').v4();  // Generate a unique order ID

    for (const item of items) {
      if (item.quantity > 0) {
        // Fetch item price from the database
        const [rows] = await db.execute(
          "SELECT item_price FROM menu WHERE item_id = ?",
          [item.item_id]
        );

        if (rows.length === 0) {
          throw new Error('Item not found');
        }

        let itemPrice = rows[0].item_price;
        itemPrice = itemPrice + (itemPrice * 0.0195); // Adding tax

        totalPrice += itemPrice * item.quantity;

        // Insert order into the orders table
        await db.execute(
          `INSERT INTO orders (user_id, order_id, item_name, item_price, quantity, total_price, order_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [user_id, orderId, item.item_name, itemPrice, item.quantity, totalPrice, order_time]
        );
      }
    }

    return { orderId, totalPrice };
  } catch (error) {
    throw new Error('Error saving order to database');
  }
}

module.exports = { placeOrderInDatabase };