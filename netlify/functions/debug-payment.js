// netlify/functions/debug-payment.js
// Visit: https://diairmy.netlify.app/.netlify/functions/debug-payment
// Shows exactly what would be sent to Fiuu — helps identify the white screen cause

const crypto = require('crypto')

exports.handler = async function (event) {
  const MERCHANT = process.env.FIUU_MERCHANT_CODE || '(NOT SET)'
  const VKEY     = process.env.FIUU_VERIFY_KEY    || '(NOT SET)'

  const amount   = '1.00'
  const orderId  = 'TEST' + Date.now()
  const currency = 'MYR'

  // Signature formula: MD5(MerchantCode + RefNo + Amount + Currency + VerifyKey)
  const raw = MERCHANT + orderId + amount + currency + VKEY
  const sig = (MERCHANT === '(NOT SET)' || VKEY === '(NOT SET)')
    ? '(CANNOT COMPUTE — env vars missing)'
    : crypto.createHash('md5').update(raw).digest('hex')

  // Mask the verify key for display (show first 4 and last 4 chars only)
  const maskedVkey = VKEY === '(NOT SET)' ? '(NOT SET)'
    : VKEY.slice(0, 4) + '••••••••' + VKEY.slice(-4)

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>DiAir Payment Debug</title>
  <style>
    body { font-family: monospace; padding: 24px; background: #0f172a; color: #e2e8f0; }
    h2 { color: #38bdf8; margin-bottom: 16px; font-size: 18px; }
    h3 { color: #94a3b8; font-size: 13px; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: .1em; }
    table { border-collapse: collapse; width: 100%; font-size: 14px; }
    td { padding: 8px 12px; border-bottom: 1px solid #1e293b; vertical-align: top; }
    td:first-child { color: #94a3b8; width: 200px; white-space: nowrap; }
    td:last-child { color: #f1f5f9; word-break: break-all; }
    .ok  { color: #4ade80; }
    .bad { color: #f87171; font-weight: bold; }
    .sig { color: #fbbf24; word-break: break-all; }
    .raw { color: #c084fc; word-break: break-all; font-size: 12px; }
    .box { background: #1e293b; border-radius: 10px; overflow: hidden; margin-bottom: 20px; }
    .warn { background: #7f1d1d; color: #fca5a5; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
    .good { background: #14532d; color: #86efac; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
    .submit-btn {
      display: inline-block; margin-top: 24px; padding: 14px 28px;
      background: #0ea5e9; color: white; border: none; border-radius: 8px;
      font-size: 16px; font-weight: bold; cursor: pointer; text-decoration: none;
    }
  </style>
</head>
<body>
  <h2>🔍 DiAir — Fiuu Payment Debug</h2>
  <p style="color:#64748b;font-size:13px;margin-bottom:20px">This page shows exactly what would be sent to Fiuu. Check for any (NOT SET) or error values.</p>

  ${MERCHANT === '(NOT SET)' || VKEY === '(NOT SET)'
    ? `<div class="warn">⚠️ MISSING ENV VARS — one or more environment variables are not set in Netlify. This is why you get a white screen.</div>`
    : `<div class="good">✓ Env vars are loaded. Check the signature formula below.</div>`
  }

  <h3>Environment Variables</h3>
  <div class="box"><table>
    <tr><td>FIUU_MERCHANT_CODE</td><td class="${MERCHANT === '(NOT SET)' ? 'bad' : 'ok'}">${MERCHANT}</td></tr>
    <tr><td>FIUU_VERIFY_KEY</td><td class="${VKEY === '(NOT SET)' ? 'bad' : 'ok'}">${maskedVkey} <span style="color:#64748b">(${VKEY.length} chars)</span></td></tr>
  </table></div>

  <h3>Form Fields That Would Be Sent</h3>
  <div class="box"><table>
    <tr><td>MerchantCode</td><td>${MERCHANT}</td></tr>
    <tr><td>RefNo</td><td>${orderId}</td></tr>
    <tr><td>Amount</td><td>${amount}</td></tr>
    <tr><td>Currency</td><td>${currency}</td></tr>
    <tr><td>ProdDesc</td><td>1.00 liter air bersih DiAir</td></tr>
    <tr><td>UserName</td><td>Pelanggan</td></tr>
    <tr><td>UserEmail</td><td>customer@diair.my</td></tr>
    <tr><td>UserContact</td><td>0122773093</td></tr>
    <tr><td>Lang</td><td>UTF-8</td></tr>
    <tr><td>SignatureType</td><td>MD5</td></tr>
    <tr><td>ResponseURL</td><td>https://diairmy.netlify.app/thankyou.html</td></tr>
    <tr><td>BackendURL</td><td>https://diairmy.netlify.app/.netlify/functions/payment-webhook</td></tr>
  </table></div>

  <h3>Signature Calculation</h3>
  <div class="box"><table>
    <tr><td>Formula</td><td>MD5( MerchantCode + RefNo + Amount + Currency + VerifyKey )</td></tr>
    <tr><td>Raw string</td><td class="raw">${
      VKEY === '(NOT SET)' || MERCHANT === '(NOT SET)'
        ? '(cannot show — env vars missing)'
        : MERCHANT + orderId + amount + currency + '(VerifyKey hidden)'
    }</td></tr>
    <tr><td>Signature (MD5)</td><td class="sig">${sig}</td></tr>
  </table></div>

  <h3>Live Test — Submit to Fiuu</h3>
  <p style="color:#64748b;font-size:13px;margin-bottom:12px">Click below to do a real RM1.00 test submission with the values above:</p>
  <form method="POST" action="https://pay.fiuu.com/index.php/api/entry">
    <input type="hidden" name="MerchantCode" value="${MERCHANT}">
    <input type="hidden" name="PaymentId"    value="">
    <input type="hidden" name="RefNo"        value="${orderId}">
    <input type="hidden" name="Amount"       value="${amount}">
    <input type="hidden" name="Currency"     value="${currency}">
    <input type="hidden" name="ProdDesc"     value="1.00 liter air bersih DiAir">
    <input type="hidden" name="UserName"     value="Pelanggan">
    <input type="hidden" name="UserEmail"    value="customer@diair.my">
    <input type="hidden" name="UserContact"  value="0122773093">
    <input type="hidden" name="Remark"       value="test">
    <input type="hidden" name="Lang"         value="UTF-8">
    <input type="hidden" name="SignatureType" value="MD5">
    <input type="hidden" name="Signature"   value="${sig}">
    <input type="hidden" name="ResponseURL"  value="https://diairmy.netlify.app/thankyou.html">
    <input type="hidden" name="BackendURL"   value="https://diairmy.netlify.app/.netlify/functions/payment-webhook">
    <button type="submit" class="submit-btn">▶ Test RM1.00 Payment Now</button>
  </form>

  <p style="color:#475569;font-size:12px;margin-top:32px">
    Delete this function after debugging. Don't leave it live permanently.
  </p>
</body>
</html>`

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html
  }
}
