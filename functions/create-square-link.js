const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  return new Promise((resolve) => {
    try {
      const body = JSON.parse(event.body || '{}');
      const amount = body.amount;
      const orderId = body.orderId;

      const token = process.env.SQUARE_ACCESS_TOKEN;
      const locationId = process.env.SQUARE_LOCATION_ID;

      if (!token || !locationId) {
        resolve({
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID in Netlify.' })
        });
        return;
      }

      const cents = Math.round(parseFloat(amount) * 100);

      const postData = JSON.stringify({
        idempotency_key: 'order-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        quick_pay: {
          name: 'Beach Eats Order ' + (orderId || ''),
          price_money: {
            amount: cents,
            currency: 'USD'
          },
          location_id: locationId
        }
      });

      const options = {
        hostname: 'connect.squareup.com',
        path: '/v2/online-checkout/payment-links',
        method: 'POST',
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(responseBody);
            if (data.payment_link && data.payment_link.url) {
              resolve({
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: data.payment_link.url })
              });
            } else {
              console.log('Square API Error:', data);
              const errMsg = data.errors && data.errors[0] ? data.errors[0].detail : 'Square rejected payment link.';
              resolve({
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: errMsg })
              });
            }
          } catch (e) {
            resolve({
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'Invalid JSON from Square API' })
            });
          }
        });
      });

      req.on('error', (err) => {
        console.log('HTTPS Request Error:', err);
        resolve({
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: err.message })
        });
      });

      req.write(postData);
      req.end();

    } catch (err) {
      resolve({
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err.message })
      });
    }
  });
};
