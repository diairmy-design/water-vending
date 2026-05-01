const BASE = 'http://api.happy-ti.com:2028'

export async function pushToDevice({ appid, saler, deviceId, value, orderId, location }) {
  const q = new URLSearchParams({
    appid, saler, deviceId,
    value: parseFloat(value).toFixed(2),
    userid: orderId,
    salerOrderId: orderId,
    location
  })
  const res = await fetch(`${BASE}/trade/v2/qrcreate?${q}`)
  return res.json()
}

export async function queryOrder({ appid, saler, deviceId, orderId }) {
  const q = new URLSearchParams({ appid, saler, deviceId, salerOrderId: orderId })
  const res = await fetch(`${BASE}/trade/query?${q}`)
  return res.json()
}