import Stripe from 'stripe';

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { transaction_amount, description } = req.body;
    
    if (!transaction_amount) {
      res.status(400).json({ error: "Missing transaction_amount parameter." });
      return;
    }

    // Convert BRL to cents (R$ 10.00 = 1000)
    const amountInCents = Math.round(transaction_amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'brl',
      payment_method_types: ['pix'],
      confirm: true,
      payment_method_data: {
        type: 'pix'
      },
      description: description || 'Recarga Predix'
    });

    if (paymentIntent.status === 'requires_action' && paymentIntent.next_action?.pix_display_details) {
      const pixDetails = paymentIntent.next_action.pix_display_details;
      res.status(200).json({
        image_url_png: pixDetails.image_url_png,
        pix_copy_paste_string: pixDetails.qr_code_copy_to_clipboard
      });
    } else {
      res.status(400).json({ error: "Stripe did not return Pix next_action details. Status: " + paymentIntent.status });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
