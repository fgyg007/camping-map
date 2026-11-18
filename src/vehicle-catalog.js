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
  ['xiaomi-su7-2024-standard-pro', '小米 SU7', '2024首代 标准版 / Pro', 4997, 1963, 1455, 'https://s1.xiaomiev.com/activity-outer-assets/0328/env/SU7%E5%8F%82%E6%95%B0%E9%85%8D%E7%BD%AE%E8%A1%A8.pdf'],
  ['xiaomi-su7-2024-max', '小米 SU7', '2024首代 Max', 4997, 1963, 1440, 'https://s1.xiaomiev.com/activity-outer-assets/0328/env/SU7%E5%8F%82%E6%95%B0%E9%85%8D%E7%BD%AE%E8%A1%A8.pdf'],
  ['xiaomi-su7-2026-standard', '小米 SU7', '2026新一代 标准版', 4997, 1963, 1460, 'https://www.xiaomiev.com/xiaomi/car-config'],
  ['xiaomi-su7-2026-pro-max', '小米 SU7', '2026新一代 Pro / Max（厂商标注车高）', 4997, 1963, 1445, 'https://www.xiaomiev.com/xiaomi/car-config'],
  ['xiaomi-yu7-2025-long-range', '小米 YU7', '2025 后驱长续航（原标准版）', 4999, 1996, 1608, 'https://www.miit.gov.cn/datainfo/dljdclscqyjcpgg/xcpgs391sqwimf/art/2025/art_273bcba72bcb4b2da92e2ca38b7cbe4a.html'],
  ['xiaomi-yu7-2025', '小米 YU7', '2025 四驱 Pro / Max（公示车高）', 4999, 1996, 1600, 'https://www.miit.gov.cn/datainfo/dljdclscqyjcpgg/xcpgs390ssew/art/2024/art_4dc6c6c7a56d4dcfb0303cf9748c1b2d.html'],
  ['xiaomi-yu7-2026-standard', '小米 YU7', '2026 后驱标准版', 4999, 1996, 1608, 'https://ir.mi.com/static-files/6d468667-c943-4753-a0e0-2e5cb11575df'],
  ['xiaomi-yu7-gt-2026', '小米 YU7 GT', '2026 中国版（工信部型号 XMA6500LBEVA9）', 5015, 2007, 1597, 'https://www.miit.gov.cn/datainfo/dljdclscqyjcpgg/xcpgs404wdsdww/art/2026/art_3b9f22f2f26941a4aecae630c4c4036e.html'],
  ['xiaomi-su7-ultra-standard-2025', '小米 SU7 Ultra', '2025 原厂标准尾翼', 5070, 1970, 1465, 'https://www.miit.gov.cn/datainfo/dljdclscqyjcpgg/bgkzn2wwee/art/2025/art_b036222751c843978b80546e86031b8f.html'],
  ['xiaomi-su7-ultra-2025', '小米 SU7 Ultra', '2025 固定式大尾翼（含纽北限量版）', 5115, 1970, 1465, 'https://www.miit.gov.cn/datainfo/dljdclscqyjcpgg/bgkzn2wwee/art/2025/art_b036222751c843978b80546e86031b8f.html'],
  ['nio-es6-2023', '蔚来 ES6', '2023新一代 中国首发版', 4854, 1995, 1703, 'https://www.nio.com/news/All-New-ES6-Launch'],
  ['nio-et5t-2023', '蔚来 ET5T', '2023中国首发 猎装版', 4790, 1960, 1499, 'https://www.nio.com/en_US/news/NIO-ET5T-Launch'],
  ['nio-es8-executive-2026', '蔚来 ES8', '全新 ES8 六座行政豪华版', 5280, 2010, 1800, 'https://order-front-h5.nio.com/configuration-detail/index?fix_font=true&is_nav_show=false&model_code=ES8&scene=office&wv=lg'],
  ['xpeng-g6-2026-625-max', '小鹏 G6', '2026款 625 Max 纯电 科技版 / 旗舰版', 4758, 1920, 1650, 'https://www.xiaopeng.com/g6_2026/configuration.html'],
  ['xpeng-g6-2026-1704-max', '小鹏 G6', '2026款 1704 Max 增程版', 4771, 1920, 1650, 'https://www.xiaopeng.com/g6_2026/configuration.html'],
  ['xpeng-g9-2025', '小鹏 G9', '2025款 Max（625 / 725 / 680四驱）', 4891, 1937, 1670, 'https://www.xiaopeng.com/g92025/configuration.html'],
  ['xpeng-x9-2026-1602', '小鹏 X9', '2026款 1602 增程系列', 5316, 1988, 1785, 'https://www.xiaopeng.com/x9_2026/configuration.html'],
  ['aito-m7-2026-max', '问界 M7', '2026款 192线激光雷达 五座增程 Max 长续航', 5080, 1999, 1780, 'https://hima.auto/wenjie/m7-new/configuration/'],
  ['aito-m8-max-plus-192', '问界 M8', '192线激光雷达 五座增程 Max+', 5190, 1999, 1795, 'https://hima.auto/wenjie/m8/configuration/'],
  ['aito-m9-2026-max-plus', '问界 M9', '2026款 五座增程 Max+（非加长）', 5285, 2026, 1845, 'https://hima.auto/wenjie/m9-new/configuration/'],
  ['li-l8-2022', '理想 L8', '2022首发 Pro / Max', 5080, 1995, 1800, 'https://ir.lixiang.com/zh-hans/news-releases/news-release-details/li-auto-inc-unveils-li-l8-its-six-seat-large-premium-smart-suv/'],
  ['li-l9-2022', '理想 L9', '2022首发', 5218, 1998, 1800, 'https://ir.lixiang.com/zh-hans/news-releases/news-release-details/li-auto-inc-unveils-li-l9-its-flagship-smart-suv'],
  ['li-mega-2024', '理想 MEGA', '2024首发', 5350, 1965, 1850, 'https://ir.lixiang.com/news-releases/news-release-details/li-auto-inc-hosts-2024-spring-launch-event'],
  ['byd-yuan-up-70kw', '比亚迪 元UP', '70 kW 申报版 BYD6433SBEV3', 4310, 1830, 1675, 'https://www.miit.gov.cn/datainfo/dljdclscqyjcpgg/xcpgs390ssew/art/2024/art_3baf653d08d145e3acdda76802bb0c99.html'],
  ['tesla-model-3-cn', '特斯拉 Model 3', '2024起 中国版 后轮驱动 / 长续航（宽度不含后视镜）', 4720, 1848, 1442, 'https://www.tesla.cn/ownersmanual/model3/zh_cn/GUID-56562137-FC31-4110-A13C-9A9FC6657BF0.html'],
  ['geely-xingyuan-310-410', '吉利 星愿', '310 / 410 km 向往版 / 乘风版', 4135, 1805, 1570, 'https://galaxy.geely.com/xingyuan'],
  ['wuling-mini-ev-gen5', '五菱 宏光MINIEV', '第五代 四门 205 / 301 km', 3268, 1520, 1575, 'https://wuling.com/carDetail?id=321'],
  ['xpeng-mona-m03-540-plus', '小鹏 MONA M03', '540 长续航 Plus', 4785, 1896, 1445, 'https://www.xiaopeng.com/m03/configuration.html'],
  ['honda-crv-2026-active', '本田 CR-V', '2026款 全球30年荣耀款 两驱活力版', 4703, 1866, 1680, 'https://www.dongfeng-honda.com/cr-v/configuration.html'],
  ['deepal-s05-4620', '深蓝 S05', '全新 S05 纯电国行版', 4620, 1900, 1600, 'https://www.deepal.com.cn/car/configuration?car=S05&sort=1&source=2'],
  ['xiaomi-skynomad-n70-pro', '小米 澎程 N70', '2026 Pro（工信部型号 XMA6500KREEVF3）', 4960, 1998, 1785, 'https://www.miit.gov.cn/datainfo/dljdclscqyjcpgg/xcpgs409dwdwe233/art/2026/art_eaf4b300d9994266b8f78c00fdaad10e.html'],
  ['xiaomi-skynomad-n70-max', '小米 澎程 N70', '2026 Max（工信部型号 XMA6500KREEVA1）', 4960, 1998, 1765, 'https://service.miit-eidc.org.cn/miitxxgk/gonggao/xxgk/queryCpData?dataTag=Z&gid=AC181394&pc=409'],
  ['xiaomi-skynomad-n90-max', '小米 澎程 N90 Max', 'Max（收顶行驶尺寸）', 5285, 1998, 1825, 'https://www.xiaomiev.com/skynomad/car-config'],
  ['xiaomi-skynomad-n90-max-expedition', '小米 澎程 N90 Max', '探索版（收顶行驶尺寸）', 5285, 1998, 1925, 'https://www.xiaomiev.com/skynomad/car-config'],
].map(([id, model, trim, lengthMm, widthMm, heightMm, sourceUrl]) =>
  Object.freeze({ id, brand: model.split(' ',1)[0], model, trim, lengthMm, widthMm, heightMm, sourceUrl }),
))

// A brand can be selected even when we have no sourced preset for it.
const commonBrands = [
  '比亚迪','大众','丰田','本田','日产','特斯拉','吉利','长安','五菱','小米',
  '蔚来','小鹏','问界','理想','零跑','深蓝','乐道','腾势','方程豹','仰望',
  '广汽传祺','埃安','奇瑞','捷途','星途','iCAR','领克','极氪','哈弗','坦克',
  '魏牌','欧拉','长城','上汽大通','宝骏','荣威','名爵','别克','雪佛兰','凯迪拉克',
  '福特','宝马','奔驰','奥迪','保时捷','沃尔沃','雷克萨斯','路虎','马自达','三菱',
  '现代','起亚','标致','雪铁龙','斯柯达','斯巴鲁','铃木','红旗','奔腾','东风风行',
  '东风奕派','北京汽车','北汽极狐','江铃','依维柯','阿维塔','智界','享界','尚界','尊界',
  '智己','极石','萤火虫','smart','长安启源','吉利银河','蓝电','岚图','东风纳米',
]
export const VEHICLE_BRANDS = Object.freeze([...new Set([...commonBrands, ...VEHICLE_CATALOG.map(entry => entry.brand)])])
export const vehiclesForBrand = brand => VEHICLE_CATALOG.filter(entry => entry.brand === brand)

