// netlify/functions/start-payment.js
// Called via GET: /.netlify/functions/start-payment?amount=1.00
// Returns a full HTML page that immediately POSTs to Fiuu.
// This approach is 100% mobile-safe — no async form.submit() issues.

const crypto = require('crypto')

exports.handler = async function (event) {
  const qs = event.queryStringParameters || {}
  const amount = parseFloat(qs.amount || '0')

  if (!amount || isNaN(amount) || amount < 0.25 || amount > 50) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: '<h2>Invalid amount. Please go back and try again.</h2>'
    }
  }

  const amountStr = amount.toFixed(2)
  const orderId   = 'WVM' + Date.now()

  const MERCHANT      = process.env.FIUU_MERCHANT_CODE  || ''
  const VKEY          = process.env.FIUU_VERIFY_KEY      || ''
  const RETURN_URL    = 'https://diairmy.netlify.app/thankyou.html'
  const CALLBACK_URL  = 'https://diairmy.netlify.app/.netlify/functions/payment-webhook'

  if (!MERCHANT || !VKEY) {
    console.error('MISSING_ENV_VARS: FIUU_MERCHANT_CODE or FIUU_VERIFY_KEY not set')
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: '<h2>Server configuration error. Please contact support.</h2>'
    }
  }

  // Fiuu hosted payment signature: MD5(MerchantCode + RefNo + Amount + Currency + VerifyKey)
  const raw       = MERCHANT + orderId + amountStr + 'MYR' + VKEY
  const signature = crypto.createHash('md5').update(raw).digest('hex')

  const litres     = amount
  const litreLabel = litres < 1
    ? Math.round(litres * 1000) + 'ml'
    : (litres % 1 === 0 ? litres + ' Liter' : (litres * 1000) + 'ml')

  const prodDesc = litreLabel + ' air bersih DiAir'

  console.log('start-payment OK', JSON.stringify({ orderId, amountStr, merchant: MERCHANT }))

  // Return a page that auto-submits the Fiuu form immediately
  const html = `<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0ea5e9">
  <title>DiAir — Proses Bayaran</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      background:linear-gradient(160deg,#e0f2fe,#bae6fd);
      min-height:100vh;display:flex;align-items:center;
      justify-content:center;padding:16px;
    }
    .card{
      background:white;border-radius:24px;padding:40px 28px;
      max-width:340px;width:100%;text-align:center;
      box-shadow:0 12px 40px rgba(14,165,233,0.18);
    }
    .spin{
      width:56px;height:56px;
      border:5px solid #bae6fd;border-top-color:#0ea5e9;
      border-radius:50%;animation:s .7s linear infinite;
      margin:0 auto 24px;
    }
    @keyframes s{to{transform:rotate(360deg)}}
    h2{font-size:19px;font-weight:800;color:#0c4a6e;margin-bottom:10px}
    .amount{font-size:36px;font-weight:900;color:#0ea5e9;margin:14px 0 6px}
    p{font-size:14px;color:#64748b;line-height:1.6}
    .note{font-size:12px;color:#94a3b8;margin-top:14px}
  </style>
</head>
<body>
  <div class="card">
    <div class="spin"></div>
    <h2>Menghantar ke halaman bayaran&hellip;</h2>
    <div class="amount">RM${amountStr}</div>
    <p>Bayaran untuk <strong>${litreLabel} air bersih</strong>.<br>Anda akan dibawa ke Fiuu sekarang.</p>
    <div class="note">Jangan tutup halaman ini.</div>
  </div>

  <form id="f" method="POST" action="https://pay.fiuu.com/index.php/api/entry">
    <input type="hidden" name="MerchantCode" value="${MERCHANT}">
    <input type="hidden" name="PaymentId"    value="">
    <input type="hidden" name="RefNo"        value="${orderId}">
    <input type="hidden" name="Amount"       value="${amountStr}">
    <input type="hidden" name="Currency"     value="MYR">
    <input type="hidden" name="ProdDesc"     value="${escHtml(prodDesc)}">
    <input type="hidden" name="UserName"     value="Pelanggan">
    <input type="hidden" name="UserEmail"    value="customer@diair.my">
    <input type="hidden" name="UserContact"  value="0122773093">
    <input type="hidden" name="Remark"       value="${escHtml(litreLabel)}">
    <input type="hidden" name="Lang"         value="UTF-8">
    <input type="hidden" name="SignatureType" value="MD5">
    <input type="hidden" name="Signature"   value="${signature}">
    <input type="hidden" name="ResponseURL"  value="${RETURN_URL}">
    <input type="hidden" name="BackendURL"   value="${CALLBACK_URL}">
  </form>
  <script>
    // Auto-submit after a short delay so the loading screen is visible
    setTimeout(function(){ document.getElementById('f').submit(); }, 600);
  </script>
</body>
</html>`

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html
  }
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
