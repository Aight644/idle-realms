const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// Stripe secret key from Firebase config
const getStripe = () => stripe(functions.config().stripe.secret_key);

// ═══ PRICE → PURCHASE MAPPING ═══
// Maps Stripe Price IDs to in-game purchase IDs
const PRICE_MAP = {
  "price_1T4urmQZjXMzndTI7OtuMCq0": { id: "premium", type: "one_time" },
  "price_1T4usJQZjXMzndTIJlB2kgGW": { id: "petslot2", type: "one_time" },
  "price_1T4usiQZjXMzndTIsTSBJAyY": { id: "petslot3", type: "one_time" },
  "price_1T4uu3QZjXMzndTIzpJvbVP2": { id: "starter_bundle", type: "one_time" },
  "price_1T4vWXQZjXMzndTIk10BD1GE": { id: "xp_mastery", type: "subscription" },
  "price_1T4vXYQZjXMzndTIrNkQ4loy": { id: "speed_mastery", type: "subscription" },
  "price_1T4vYTQZjXMzndTIzVrdFB2u": { id: "combat_mastery", type: "one_time" },
  "price_1T4vZ2QZjXMzndTIwANSmmrO": { id: "lucky_drops", type: "subscription" },
  "price_1T4vZVQZjXMzndTINZQRz1V0": { id: "gold_rush", type: "one_time" },
};

// ═══ CREATE CHECKOUT SESSION ═══
// Called from frontend when user clicks "Buy"
exports.createCheckoutSession = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    try {
      const { priceId, userId, username } = req.body;
      if (!priceId || !userId) return res.status(400).json({ error: "Missing priceId or userId" });

      const purchaseInfo = PRICE_MAP[priceId];
      if (!purchaseInfo) return res.status(400).json({ error: "Invalid priceId" });

      const stripeClient = getStripe();

      // Check if already purchased (one-time items)
      if (purchaseInfo.type === "one_time") {
        const existingDoc = await db.collection("purchases").doc(userId).get();
        if (existingDoc.exists) {
          const data = existingDoc.data();
          if (data[purchaseInfo.id]) {
            return res.status(400).json({ error: "Already purchased" });
          }
        }
      }

      const sessionParams = {
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: purchaseInfo.type === "subscription" ? "subscription" : "payment",
        success_url: `${req.headers.origin || "https://idle-realms-hazel.vercel.app"}?purchase=success&item=${purchaseInfo.id}`,
        cancel_url: `${req.headers.origin || "https://idle-realms-hazel.vercel.app"}?purchase=cancelled`,
        metadata: {
          userId,
          username: username || "",
          purchaseId: purchaseInfo.id,
        },
        client_reference_id: userId,
      };

      // For subscriptions, attach customer
      if (purchaseInfo.type === "subscription") {
        // Find or create Stripe customer
        let customerId;
        const userDoc = await db.collection("stripe_customers").doc(userId).get();
        if (userDoc.exists) {
          customerId = userDoc.data().stripeCustomerId;
        } else {
          const customer = await stripeClient.customers.create({
            metadata: { firebaseUID: userId, username: username || "" },
          });
          customerId = customer.id;
          await db.collection("stripe_customers").doc(userId).set({ stripeCustomerId: customerId });
        }
        sessionParams.customer = customerId;
      }

      const session = await stripeClient.checkout.sessions.create(sessionParams);
      res.json({ url: session.url });
    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ error: err.message });
    }
  });
});

// ═══ STRIPE WEBHOOK ═══
// Listens for completed payments and grants purchases
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const stripeClient = getStripe();
  const sig = req.headers["stripe-signature"];
  const webhookSecret = functions.config().stripe.webhook_secret;

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId || session.client_reference_id;
      const purchaseId = session.metadata?.purchaseId;

      if (!userId || !purchaseId) {
        console.error("Missing metadata in session:", session.id);
        break;
      }

      console.log(`✅ Payment completed: ${purchaseId} for user ${userId}`);

      // Grant the purchase in Firestore
      await grantPurchase(userId, purchaseId);
      break;
    }

    case "customer.subscription.deleted": {
      // Subscription cancelled — revoke access
      const subscription = event.data.object;
      const customerId = subscription.customer;

      // Find user by Stripe customer ID
      const snapshot = await db.collection("stripe_customers")
        .where("stripeCustomerId", "==", customerId).limit(1).get();

      if (!snapshot.empty) {
        const userId = snapshot.docs[0].id;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const purchaseInfo = priceId ? PRICE_MAP[priceId] : null;

        if (purchaseInfo) {
          console.log(`❌ Subscription cancelled: ${purchaseInfo.id} for user ${userId}`);
          await revokePurchase(userId, purchaseInfo.id);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// ═══ GRANT PURCHASE ═══
async function grantPurchase(userId, purchaseId) {
  const ref = db.collection("purchases").doc(userId);
  await ref.set({
    [purchaseId]: {
      granted: true,
      grantedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
  }, { merge: true });

  console.log(`🎁 Granted ${purchaseId} to ${userId}`);
}

// ═══ REVOKE PURCHASE (subscription cancellation) ═══
async function revokePurchase(userId, purchaseId) {
  const ref = db.collection("purchases").doc(userId);
  await ref.set({
    [purchaseId]: {
      granted: false,
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
  }, { merge: true });

  console.log(`🚫 Revoked ${purchaseId} from ${userId}`);
}

// ═══ CHECK PURCHASES ═══
// Called from frontend to check what user has purchased
exports.checkPurchases = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "Missing userId" });

      const doc = await db.collection("purchases").doc(userId).get();
      if (!doc.exists) return res.json({ purchases: {} });

      const data = doc.data();
      const purchases = {};
      for (const [key, val] of Object.entries(data)) {
        purchases[key] = val.granted === true;
      }

      res.json({ purchases });
    } catch (err) {
      console.error("Check purchases error:", err);
      res.status(500).json({ error: err.message });
    }
  });
});
