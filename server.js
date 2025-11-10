import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';

// ---- Optional Supabase (safe fallback) ----
let sb = null;
try {
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_ANON_KEY;
  if (SUPA_URL && SUPA_KEY && /^https?:\/\//i.test(SUPA_URL)) {
    const { createClient } = await import('@supabase/supabase-js');
    sb = createClient(SUPA_URL, SUPA_KEY);
    console.log('✅ Supabase enabled');
  } else {
    console.warn('⚠️ Supabase disabled (missing/invalid SUPABASE_URL or key)');
  }
} catch (e) {
  console.warn('⚠️ Supabase not loaded, continuing without DB:', e?.message);
}

const app = express();
app.use(express.json({ type: '*/*' }));

const WP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const VERIFY = process.env.APP_VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

const PRICE_MRP = 3250;
const PRICE_SALE = 2680;

const sendWA = async (to, text) => {
  const url = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });
  } catch (e) {
    console.error('sendWA error', e);
  }
};

const intents = [
  { key: 'greet', test: /hi|hello|namaste|salaam|hey/i },
  { key: 'pcod', test: /pcod|pcos/i },
  { key: 'liver', test: /liver|fatty|acidity/i },
  { key: 'fat', test: /fat\s*cleanser|metabolism|inch/i },
  { key: 'wasago', test: /wasa\s*go|wasago|obese|motapa|weight/i },
  { key: 'buy', test: /buy|order|cod|upi/i },
];

const replies = {
  greet:
    'Namaste! 👋 Main Dr. Maaz team ka AI assistant hoon. Kaunsa product chahiye — PCOD Cleanser, Liver Detox, Fat Cleanser ya WasaGo?',
  pcod: `✨ *PCOD Cleanser* hormonal balance ke liye.\nMRP ₹${PRICE_MRP} — Offer ₹${PRICE_SALE}`,
  liver: `🌿 *Liver Detox* fatty liver & acidity me support karta hai.\nMRP ₹${PRICE_MRP} — Offer ₹${PRICE_SALE}`,
  fat: `🔥 *Fat Cleanser* metabolism improve karta hai.\nMRP ₹${PRICE_MRP} — Offer ₹${PRICE_SALE}`,
  wasago: `🏃 *WasaGo* (Ayurveda + Unani) weight loss formula.\nMRP ₹${PRICE_MRP} — Offer ₹${PRICE_SALE}`,
  buy: 'Order confirm karu? COD ya UPI? Address bhej dijiye — dispatch aaj hi ho jayega 😊',
  fallback:
    'Kya aap product chahte ho (PCOD, Liver, Fat, WasaGo) ya patient-wise suggestion?',
};

app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    const from = msg.from;
    const text = (msg.text?.body || '').trim();
    const intent = intents.find((i) => i.test.test(text))?.key || 'fallback';

    // Best-effort log (only if Supabase is configured)
    if (sb) {
      try {
        await sb.from('events').insert({
          type: 'incoming',
          meta_json: { from, text },
        });
      } catch {}
    }

    await sendWA(from, replies[intent] || replies.fallback);

    res.sendStatus(200);
  } catch (e) {
    console.error('webhook error', e);
    res.sendStatus(200);
  }
});

app.get('/', (_, res) => res.send('OK'));
app.listen(PORT, () => console.log('✅ Server live on', PORT));
