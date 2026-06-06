// routes/webhook.routes.js
router.post('/paystack/webhook', async (req, res) => {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).end();
  }

  const { event, data } = req.body;

  if (event === 'charge.success') {
    const user = await User.findOne({ email: data.customer.email });
    const plan = data.metadata.plan; // pass plan in Paystack metadata
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await subscriptionService.upgradePlan(user, plan, data.reference, periodEnd);
  }

  res.sendStatus(200);
});