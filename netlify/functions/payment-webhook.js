// netlify/functions/payment-webhook.js
// Receives Fiuu payment callback → pushes signal to Happy-ti machine
// CommonJS — self-contained, no external imports

const crypto = require('crypto')

// ─── Happy-ti API ─────────────────────────────────────────────────────────────
async function pushToDevice({ appid, saler, deviceId, value, orderId, location }) {
  const BASE = 'http://api.happy-ti.com:2028'
  const q = new URLSearchParams({
    appid, saler, deviceId,
    value:        parseFloat(value).toFixed(2),
    userid:       orderId,
    salerOrderId: orderId,
    location
  })
  const res = await fetch(`${BASE}/trade/v2/qrcreate?${q}`)
  return res.json()
}
// ─────────────────────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const params = new URLSearchParams(event.body || '')

  const txnStatus  = params.get('status')
  const amount     = params.get('amount')
  const orderId    = params.get('orderid')
  const tranID     = params.get('tranID')
  const appCode    = params.get('appcode')
  const currency   = params.get('currency') || 'MYR'
  const skey       = params.get('skey')

  const MERCHANT   = process.env.FIUU_MERCHANT_CODE
  const VKEY       = process.env.FIUU_VERIFY_KEY

  // ── 1. Verify Fiuu skey using Verify Key only ─────────────────────────────
  // Formula: MD5( tranID + MerchantCode + StatusCode + OrderID + Amount + Currency + AppCode + VerifyKey )
  const skeyRaw      = tranID + MERCHANT + txnStatus + orderId + amount + currency + appCode + VKEY
  const expectedSkey = crypto.createHash('md5').update(skeyRaw).digest('hex')

  if (skey && skey !== expectedSkey) {
    console.error('SKEY_MISMATCH', JSON.stringify({ received: skey, expected: expectedSkey, orderId }))
    return { statusCode: 403, body: 'invalid_signature' }
  }

  // ── 2. Only act on successful payments ───────────────────────────────────
  if (txnStatus !== '00') {
    console.log('PAYMENT_NOT_SUCCESS', JSON.stringify({ orderId, txnStatus }))
    return { statusCode: 200, body: 'RECEIVEOK' }
  }

  // ── 3. Push amount to Happy-ti device ────────────────────────────────────
  const { HAPPYTI_APPID, HAPPYTI_SALER, DEVICE_ID, DEVICE_LOCATION } = process.env
  let pushed = false

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await pushToDevice({
        appid:    HAPPYTI_APPID,
        saler:    HAPPYTI_SALER,
        deviceId: DEVICE_ID,
        value:    amount,
        orderId,
        location: DEVICE_LOCATION
      })

      if (result.code === '0') { pushed = true; break }
      if (result.code !== '1008') {
        console.error('PUSH_FAIL', JSON.stringify({ orderId, amount, result }))
        break
      }
      await new Promise(r => setTimeout(r, 2000))

    } catch (err) {
      console.error('PUSH_EXCEPTION', err.message)
      break
    }
  }

  if (pushed) {
    console.log('PUSH_OK', JSON.stringify({ orderId, amount, tranID }))
  } else {
    console.error('REFUND_NEEDED', JSON.stringify({ orderId, amount, tranID }))
  }

  return { statusCode: 200, body: 'RECEIVEOK' }
}
