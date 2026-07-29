exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, orderId } = JSON.parse(event.body);

    const token = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!token || !locationId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing Square Environment Variables' }),
      };
    }

    const cents = Math.round(parseFloat(amount) * 100);

    const response = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idempotency_key: `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        quick_pay: {
          name: `Beach Eats Order ${orderId || ''}`,
          price_money: {
            amount: cents,
            currency: 'USD'
          },
          location_id: locationId
        }
      })
    });

    const data = await response.json();

    if (data.payment_link && data.payment_link.url) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.payment_link.url }),
      };
    } else {
      console.error("Square API Direct Error:", data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.errors ? data.errors[0].detail : 'Failed to create payment link' }),
      };
    }
  } catch (error) {
    console.error("Serverless Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
