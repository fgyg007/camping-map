// Factory reference dimensions for named China-market variants, checked 2026-11-18.
// Do not substitute dimensions for a different trim, market, or modified vehicle.
const maxusShort = 'https://www.saicmaxus.com/uploads/month_202512/files/46c1b80296e609b4cff93ac54273f65b.pdf'
const teslaChina = 'https://www.tesla.cn/ownersmanual/modely/zh_cn/GUID-1E76B638-7B12-4D9A-8767-94B7F1E92A0E.html'

export const VEHICLE_CATALOG = Object.freeze([
  ['changan-cs75plus-4-2026', '长安 第四代 CS75 PLUS', '2026款 新蓝鲸', 4770, 1910, 1705, 'https://www.changan.com.cn/car/cs75plus-4nd-2026'],
  ['changan-uniz-fuel-2026', '长安 UNI-Z', '2026款 燃油 PRO/MAX', 4730, 1890, 1680, 'https://www.changan.com.cn/car/UNI-Z-fuel_26'],
  ['geely-xingyue-l-jinzhao-2025', '吉利 星越L', '2025款 东方曜今朝版', 4770, 1895, 1689, 'https://global.geely.com/-/media/project/web-portal/parallel-car/xingyuel-01/geely-xingyue-l-dongfangyao-specification-table.pdf'],
  ['li-l6-2024', '理想 L6', '2024首发 Pro/Max', 4925, 1960, 1735, 'https://ir.lixiang.com/news-releases/news-release-details/li-auto-inc-launches-li-l6-five-seat-premium-family-suv/'],
  ['li-l7-2023', '理想 L7', '2023首发', 5050, 1995, 1750, 'https://ir.lixiang.com/news-releases/news-release-details/li-auto-inc-launches-li-l7-five-seat-flagship-family-suv'],
  ['tesla-model-y-premium-cn', '特斯拉 Model Y', '中国版 Premium 五座（宽度不含后视镜）', 4797, 1920, 1624, teslaChina],
  ['gac-m8-master-elite', '广汽传祺 M8', '大师尊贵版 2.0T 8AT', 5212, 1893, 1823, 'https://www.gacmotor.com/m8xds_new/empow01.html'],
  ['gac-m8-lingxiu-390t', '广汽传祺 M8', '领秀 390T 尊享版', 5089, 1884, 1822, 'https://gacmotor.com/m8_new/m802.html'],
  ['wey-gaoshan-7', '魏牌 高山7', '常规版（非 SUV 版）', 5050, 1960, 1900, 'https://www.wey.com/gaoshan.html'],
  ['maxus-v80-short-low', '上汽大通 V80', '傲运通(PRO)升级版 短轴超低顶', 4950, 1998, 2070, maxusShort],
  ['maxus-v80-short-mid', '上汽大通 V80', '傲运通(PRO)升级版 短轴中顶', 4950, 1998, 2345, maxusShort],
  ['maxus-v80-pro-long-high', '上汽大通 V80', 'PRO 傲运通 长轴高顶 147Ps（6/7/8/9座）', 5490, 1998, 2552, 'https://www.saicmaxus.com/uploads/month_202610/files/43af9eba5d4ef9622e58fbd38375b92c.pdf#page=5'],
].map(([id, model, trim, lengthMm, widthMm, heightMm, sourceUrl]) => Object.freeze({ id, model, trim, lengthMm, widthMm, heightMm, sourceUrl })))
