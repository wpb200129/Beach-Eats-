const { Client, Environment } = require('square');

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Production,
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, orderId } = JSON.parse(event.body);

    const response = await client.checkoutApi.createPaymentLink({
      idempotencyKey: `order-${Date.now()}`,
      quickPay: {
        name: `Beach Eats Order ${orderId || ''}`,
        priceMoney: {
          amount: Math.round(parseFloat(amount) * 100), // Converted to cents
          currency: 'USD',
        },
        locationId: process.env.SQUARE_LOCATION_ID,
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: response.result.paymentLink.url }),
    };
  } catch (error) {
    console.error("Square API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
