const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const NodeCache = require('node-cache');
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize the cache (default TTL of 1 hour)
const cache = new NodeCache({ stdTTL: 3600 });

// Order Placement API
router.post('/buyNow', async (req, res) => {
  try {
    const { name, phone, email, items, order_time } = req.body;

    let totalPrice = 0.00;
    let orderId = uuidv4();

    for (const item of items) {
      if (item.quantity > 0) {
        // Fetch item price from Supabase
        const { data: it, error: userError } = await supabase
          .from('menu')
          .select('item_price,canteenId')
          .eq('item_id', item.item_id)
          .single();

        if (userError || !it) {
          return res.json({ code: -1, message: 'Error while fetching menu price' });
        }

        let itemPrice = Number(it.item_price);
        itemPrice = itemPrice + (itemPrice * 0.0195); // adding tax

        totalPrice += itemPrice * item.quantity;

        // Insert order into the orders table
        const { error } = await supabase
          .from('orders')
          .insert({
            order_id: orderId,
            user_id: Number(phone),
            item_id: item.item_id,
            quantity: item.quantity,
            payment_status: 'Pending',
            name: name,
            datetime: getTime(),
            price: itemPrice * item.quantity,
            canteenId: it.canteenId,
            orderTime: order_time,
            email: email
          });

        if (error) {
          return res.json({ code: -1, message: 'Error placing the order.' });
        }
      }
    }

    // Prepare order object for Cashfree Payment Gateway
    const obj = {
      order_amount: Math.ceil(totalPrice),
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: name.split(' ')[0] + "_" + phone,
        customer_phone: phone,
        customer_name: name
      },
      order_meta: {
        return_url: "https://kleats.in/api/order?order_id={order_id}"
      }
    };

    // Call Cashfree API for payment link
    const response = await fetch("https://api.cashfree.com/pg/orders", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-Id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET,
        'x-api-version': process.env.CASHFREE_API_VERSION
      },
      body: JSON.stringify(obj)
    });

    const data = await response.json();

    if (data.type) {
      return res.json({ code: -1, message: data.message });
    }

    return res.json({ code: 1, message: 'Success', data: data });

  } catch (err) {
    console.error(err);
    return res.json({ code: -1, message: 'Internal Server Error' });
  }
});

// New API to fetch orders in the last month and total money spent
router.get('/lastMonthOrders', async (req, res) => {
  try {
    // Check if data is cached
    const cacheKey = 'lastMonthOrders';
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log('Returning cached data');
      return res.json(cachedData); // Return cached data
    }

    // Get the date for 30 days ago
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');  // Format: YYYY-MM-DD HH:mm:ss

    // Fetch orders from the last month
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, menu:item_id(name, item_price)')
      .gte('datetime', formattedDate)  // Get orders where datetime is greater than or equal to 30 days ago
      .order('datetime', { ascending: false });

    if (error) {
      return res.json({ code: -1, message: 'Error fetching last month orders.' });
    }

    // Calculate the total money spent in the last month
    let totalMoneySpent = 0;
    orders.forEach(order => {
      totalMoneySpent += order.price;
    });

    const response = {
      code: 1,
      message: 'Success',
      data: {
        orders: orders,
        totalMoneySpent: totalMoneySpent
      }
    };

    // Cache the response data
    cache.set(cacheKey, response);

    return res.json(response);

  } catch (err) {
    console.error(err);
    return res.json({ code: -1, message: 'Internal Server Error' });
  }
});

// Helper function to get formatted date and time
function getTime() {
  const currentDateTime = new Date();
  const year = currentDateTime.getFullYear();
  const month = (currentDateTime.getMonth() + 1).toString().padStart(2, '0');
  const day = currentDateTime.getDate().toString().padStart(2, '0');
  const hours = currentDateTime.getHours().toString().padStart(2, '0');
  const minutes = currentDateTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentDateTime.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = router;
