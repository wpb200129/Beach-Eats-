exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const amount = body.amount;
    const orderId = body.orderId;

    const token = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!token || !locationId) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID in Netlify.' })
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
        idempotency_key: 'order-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        quick_pay: {
          name: 'Beach Eats Order ' + (orderId || ''),
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
        body: JSON.stringify({ url: data.payment_link.url })
      };
    } else {
      console.log('Square API Response Error:', data);
      const errMsg = data.errors && data.errors[0] ? data.errors[0].detail : 'Square rejected the payment link generation.';
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errMsg })
      };
    }
  } catch (err) {
    console.log('Function Exception:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
