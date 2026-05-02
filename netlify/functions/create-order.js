// netlify/functions/create-order.js
// Called by pay.html before redirecting to Fiuu
// Returns orderId + MD5 signature (VerifyKey never leaves the server)

import crypto from 'crypto'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { amount } = JSON.parse(event.body)
    const amountStr = parseFloat(amount).toFixed(2)   // e.g. "1.00"
    const orderId   = 'WVM' + Date.now()

    const { FIUU_MERCHANT_CODE, FIUU_VERIFY_KEY } = process.env

    // Fiuu MD5 signature format: MerchantCode + RefNo + Amount + Currency + VerifyKey
    const raw = FIUU_MERCHANT_CODE + orderId + amountStr + 'MYR' + FIUU_VERIFY_KEY
    const signature = crypto.createHash('md5').update(raw).digest('hex')

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        signature,
        amount: amountStr,
        merchantCode: FIUU_MERCHANT_CODE
      })
    }
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) }
  }
}
