// 从质检单创建入库单
export function createInboundFromQuality(data) {
  return request({
    url: '/inventory/inbound/from-quality',
    method: 'post',
    data
  })
} 