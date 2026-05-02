// netlify/functions/create-order.js
// Generates a signed Fiuu order — called by pay.html before redirecting
// CommonJS — no imports needed, works on Netlify without esbuild

const crypto = require('crypto')

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // CORS headers so pay.html can call this from the browser
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const amount = parseFloat(body.amount)

    if (!amount || isNaN(amount) || amount < 0.25) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid amount' })
      }
    }

    const amountStr = amount.toFixed(2)               // "1.00"
    const orderId   = 'WVM' + Date.now()              // e.g. WVM1714123456789

    const MERCHANT  = process.env.FIUU_MERCHANT_CODE
    const VKEY      = process.env.FIUU_VERIFY_KEY

    if (!MERCHANT || !VKEY) {
      console.error('Missing env vars: FIUU_MERCHANT_CODE or FIUU_VERIFY_KEY')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      }
    }

    // Fiuu hosted payment signature formula:
    // MD5( MerchantCode + RefNo + Amount + Currency + VerifyKey )
    const raw       = MERCHANT + orderId + amountStr + 'MYR' + VKEY
    const signature = crypto.createHash('md5').update(raw).digest('hex')

    console.log('create-order OK', JSON.stringify({ orderId, amountStr }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        orderId,
        signature,
        amount:       amountStr,
        merchantCode: MERCHANT
      })
    }

  } catch (err) {
    console.error('create-order error:', err.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    }
  }
}
