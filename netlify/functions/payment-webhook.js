import { pushToDevice } from '../../lib/happyti.js'
import crypto from 'crypto'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method Not Allowed' }

  const params = new URLSearchParams(event.body)
  const txnStatus = params.get('TxnStatus')
  const amount    = params.get('Amount')
  const orderId   = params.get('MerchantOrderID')
  const hashValue = params.get('HashValue')

  const merchantCode = process.env.FIUU_MERCHANT_CODE
  const verifyKey    = process.env.FIUU_VERIFY_KEY
  const raw = merchantCode + orderId + amount.replace('.','') + txnStatus + verifyKey
  const expected = crypto.createHash('md5').update(raw).digest('hex')

  if (hashValue !== expected)
    return { statusCode: 403, body: 'invalid_signature' }

  if (txnStatus !== '00')
    return { statusCode: 200, body: 'RECEIVEOK' }

  const { HAPPYTI_APPID, HAPPYTI_SALER, DEVICE_ID, DEVICE_LOCATION } = process.env
  let pushed = false

  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await pushToDevice({
      appid: HAPPYTI_APPID, saler: HAPPYTI_SALER,
      deviceId: DEVICE_ID, value: amount,
      orderId, location: DEVICE_LOCATION
    })
    if (result.code === '0') { pushed = true; break }
    if (result.code !== '1008') break
    await new Promise(r => setTimeout(r, 2000))
  }

  if (!pushed)
    console.error('REFUND_NEEDED', JSON.stringify({ orderId, amount }))
  else
    console.log('PUSH_OK', JSON.stringify({ orderId, amount }))

  return { statusCode: 200, body: 'RECEIVEOK' }
}