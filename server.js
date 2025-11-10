import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ type: '*/*' }));

const WP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const VERIFY = process.env.APP_VERIFY_TOKEN;
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_ANON_KEY;
const PORT = process.env.PORT || 3000;
const PRICE_MRP = 3250;
const PRICE_SALE = 2680;

const sb = createClient(SUPA_URL, SUPA_KEY);

const sendWA = async (to, text) => {
  const url = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    })
  });
};

const intents=[
  {key:'greet',test:/hi|hello|namaste|salaam|hey/i},
  {key:'pcod',test:/pcod|pcos/i},
  {key:'liver',test:/liver|fatty|acidity/i},
  {key:'fat',test:/fat\\s*cleanser|metabolism|inch/i},
  {key:'wasago',test:/wasa\\s*go|obese|motapa|weight/i},
  {key:'buy',test:/buy|order|cod|upi/i}
];

const replies={
  greet:'Namaste! 👋 Main Dr. Maaz team ka AI assistant hoon. Kaunsa product chahiye — PCOD Cleanser, Liver Detox, Fat Cleanser ya WasaGo?',
  pcod:`✨ *PCOD Cleanser* hormonal balance ke liye.\nMRP ₹${PRICE_MRP} — Offer ₹${PRICE_SALE}`,
  liver:`🌿 *Liver Detox* fatty liver & acidity me support karta hai.\nMRP ₹${PRICE_MRP} — Offer ₹${PRICE_SALE}`,
  fat:`🔥 *Fat Cleanser* metabolism improve karta hai.\nMRP ₹${PRICE_MRP} — Offer ₹${PRICE_SALE}`,
  wasago:`🏃 *WasaGo* (Ayurveda + Unani) weight loss formula.\nMRP ₹${PRICE_MRP} — Offer ₹${PRICE_SALE}`,
  buy:'Order confirm karu? COD ya UPI? Address bhej dijiye — dispatch aaj hi ho jayega 😊',
  fallback:'Kya aap product chahte ho (PCOD, Liver, Fat, WasaGo) ya patient-wise suggestion?'
};

app.get('/webhook/whatsapp',(req,res)=>{
  const{ 'hub.mode':m,'hub.verify_token':t,'hub.challenge':c}=req.query;
  if(m==='subscribe'&&t===VERIFY)return res.status(200).send(c);
  res.sendStatus(403);
});

app.post('/webhook/whatsapp',async(req,res)=>{
  const msg=req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if(!msg)return res.sendStatus(200);
  const from=msg.from;
  const text=(msg.text?.body||'').trim();
  const intent=intents.find(i=>i.test.test(text))?.key||'fallback';
  await sendWA(from,replies[intent]||replies.fallback);
  res.sendStatus(200);
});

app.listen(PORT,()=>console.log('✅ Ayurveda Bot live on',PORT));
