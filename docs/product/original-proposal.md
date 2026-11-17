# **床车/宿营车露营地图 App 产品设计与技术架构方案**

# **一、 项目定位与核心痛点**

## **1.1 产品形态**

轻量级跨平台露营地理数据库与车友实测点评工具。优先打包为 **Android APK** 安装包，同时兼顾 **Web / PWA** 跨端访问能力。

## **1.2 核心痛点解决**

* **信息碎片化**：微信群、小红书笔记里的野生营地散落各处，缺乏结构化沉淀与可视化检索能力。  
* **参数盲区与通行风险**：不同床车、改装宿营车及房车的长宽高与底盘通过性差异巨大。现场常遇到临时限高杆、窄路无法掉头、低矮树枝刮车顶或烂路托底等隐患。  
* **时效性缺失**：野生营地易受季节变化、生态管控、工程施工、保安驱赶或临时封路影响，极度依赖社区提供持续的"实时打卡与状态校验"。

---

# **二、 核心功能模块设计**

## **2.1 全平台"一键导入"引擎（系统级 Share Intent 拦截）**

利用 Android 系统的原生分享菜单（`ACTION_SEND`），用户在高德、百度、腾讯、Google Maps、小红书或微信中点击「分享」\$\\rightarrow\$「更多」\$\\rightarrow\$ 选择本 App，即可将链接或图文静默传入后台完成自动解析。

| 来源平台 | 解析与提取逻辑 | 坐标系及处理方式 |
| :---- | :---- | :---- |
| **高德地图** (`surl.amap.com`) | 追溯 `302` 重定向获取长链接，正则匹配提取 `q=lat,lng` 及地点名称 | **GCJ-02**；若为官方 POI，调用高德 Web 服务 API 补全详细地址与官方示意图 |
| **百度地图** (`j.map.baidu.com`) | 展开重定向链接，解析百度墨卡托投影坐标（BD09MC） | **BD-09**；经算法矩阵转换为标准经纬度后统一归档 |
| **腾讯地图 / 微信位置** (`map.qq.com`) | 直接提取 `marker=coord:lat,lng` 坐标参数 | **GCJ-02**；微信位置卡片支持截图识别或转发至服务号自动解析 |
| **Google Maps** (`maps.app.goo.gl`) | 展开短链，正则匹配 `@lat,lng` 或 `!3dlat!4dlng` | **WGS-84**（海外）/ **GCJ-02**（中国大陆区域自动对齐） |
| **小红书分享链接** | 后台抓取笔记正文与图集，通过 AI 提炼地名关键词并反查地图 API | 结合文本上下文识别经纬度，并对图集进行本地化转存以防防盗链失效 |
| **批量数据搬家** | 提供专用导入接口，支持解析高德共创地图及公开收藏夹 JSON 数据 | 批量提取 POI 列表，自动化完成坐标校验与多源数据去重合并 |

## **2.2 多平台导航回流与坐标系双轨制**

* **坐标系双轨存储**：底层数据库同步维护标准 GPS 坐标（**WGS-84**）与火星坐标（**GCJ-02**）。拉起第三方导航时，根据目标客户端要求进行实时离线转换（如生成 BD-09），确保定位零偏移。  
* **多引擎底图无缝切换**：默认加载高德地图 JS API（提供矢量路网与高清卫星图），同时集成 Google Maps API 及 Leaflet 全球卫星图，全面覆盖国内与出境自驾需求。  
* **一键拉起外部导航（URI Scheme 映射）**：  
  * **高德地图**：`amapuri://route/plan/?dlat={lat}&dlon={lng}&dname={name}&dev=0&t=0`  
  * **百度地图**：`baidumap://map/direction?destination=latlng:{lat},{lng}|name:{name}&mode=driving`  
  * **腾讯地图**：`qqmap://map/routeplan?type=drive&tocoord={lat},{lng}&to={name}`  
  * **Google Maps**：`google.navigation:q={lat},{lng}`  
  * **原始坐标复制**：支持一键导出标准经纬度文本（`lat, lng`），便于直接粘贴至车载 GPS 设备或专业的越野轨迹管理软件。

## **2.3 车型尺寸自动反查与实测对比（核心亮点）**

* **车型档案建立与 AI 智能补全**：  
  * 用户在个人中心或提交点评时输入模糊车型描述（如"大通V80 短轴低顶"、"福特全顺 T6"、"理想L8"）。  
  * 系统优先检索本地车型字典；若未命中，自动调用带有联网能力的轻量化大模型 API，智能补全官方标准数据：**车长、车宽、车高（mm）、最小离地间隙（mm）、驱动形式（两驱/四驱）**。  
  * 允许用户进行个性化微调（例如：加装车顶行李架、侧边帐或升顶后增加 `15~25cm` 的实际车高）。  
* **动态尺寸差值警示看板**：  
  * 当用户查看营地详情时，系统自动将**当前登录用户的车身参数**与**历史上在该营地打卡的车友车辆数据**进行交叉比对。  
  * 自动输出可视化风险预警（例如：`车高 +77cm ⚠️ 注意限高杆与低矮树枝`、`车长 +126cm ⚠️ 窄路掉头与标准车位匹配度低`），帮助车主精准决策。

```
[ 用户车辆档案 ]                [ 营地历史打卡数据 ]
 车高: 2650 mm (含行李架)        实测限高: 2200 mm
 车长: 5498 mm                  车位类型: 紧凑型碎石位
        │                              │
        └──────────────┬───────────────┘
                       ▼
          ┌──────────────────────────┐
          │ ⚠️ 尺寸差值预警看板      │
          ├──────────────────────────┤
          │ 车高超出 450mm  (无法通过)│
          │ 推荐停靠区域: 外部开阔场地│
          └──────────────────────────┘
```

## **2.4 设施点评、照片管理与状态打卡**

* **多维结构化评测指标**：  
  * **通行与路况**：轿车通行可行性、实测限高高度（米）、铺装/碎石/泥泞陡坡等路面材质。  
  * **驻车与水电**：车位地面平整度（1\~5 星）、收费情况、清洁公厕距离、水源补给（自来水/井水）、220V 取电/充电桩配置、垃圾放置点。  
  * **环境与规则**：卡式炉/明火许可度、夜间环境噪音指数、移动/联通/电信三网信号覆盖强度。  
  * **动态时效打卡**：支持车友一键更新营地最新状态（如"2026年11月实测正常开放"、"季节性封山"、"已加装铁墩封闭"）。  
* **照片多渠道导入与预处理**：  
  1. **解析提取**：从小红书等外部链接中自动抓取高质量实景图，并转存至云存储。  
  2. **本地上传**：通过移动端相册或微信截图批量导入，前端使用 Canvas 进行智能压缩（单张控制在 300KB 左右）。  
  3. **EXIF 坐标校准**：提取现场实拍照片中的 EXIF 原生 GPS 信息，用以自动修正或校验营地的准确驻车位置。

---

# **三、 AI 自动化引擎分工**

系统将 AI 定位为后台静默的数据处理管道，专注于非结构化文本与图像的自动化清洗，不干扰用户的日常交互。

```
[ 外部非结构化数据 ]
(小红书/微信群文本/车友图片)
       │
       ▼
┌────────────────────────────────────────────────────────┐
│                      AI 管道引擎                        │
├───────────────┬───────────────┬───────────────┬────────┤
│ 1. 帖子解析官  │ 2. 车型翻译官 │ 3. 照片质检员 │ 4. 避坑总结器 │
└───────┬───────┴───────┬───────┴───────┬───────┴───┬────┘
        │               │               │           │
        ▼               ▼               ▼           ▼
[ 结构化 JSON ]  [ 车身尺寸参数 ] [ 智能标签图集 ] [ 一句话情报 ]
```

1. **帖子解析官**：将小红书笔记或微信群交流中的口语化文案解析为标准 JSON。自动识别水电公厕配置、提取限制条件（限高/限宽）与避坑建议，并自动生成地图搜索关键词。  
2. **车型翻译官**：自动将用户输入的各种模糊车型别称映射至标准数据库，补全长宽高与驱动形式，免去人工维护庞大汽车配置库的成本。  
3. **照片质检员**：采用轻量级视觉模型对图片进行识别，自动过滤人像自拍、美食等无关内容，并将有效照片归类为 `[营地全景]`、`[入口路况/限高]`、`[水电设施]` 等模块。  
4. **避坑总结器**：当同一营地的点评数量达到设定阈值时，自动提取并提炼置顶的"最新实测情报"（综合最新开放状态、限高变化及周末拥挤程度）。

---

# **四、 数据库表结构设计**

```
users_vehicles ──1:N──> campsite_reviews ──1:N──> campsite_photos
                               │
                             N:1
                               │
                           campsites
```

```
-- 1. 用户与座驾档案表
CREATE TABLE users_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL,
    nickname VARCHAR(50),
    vehicle_model VARCHAR(100),         -- 车型名称（如：大通V80短轴低顶）
    length_mm INT,                      -- 车长 (毫米)
    width_mm INT,                       -- 车宽 (毫米)
    actual_height_mm INT,               -- 含改装实际车高 (毫米)
    drive_type VARCHAR(20),             -- 两驱 / 适时四驱 / 全时四驱
    power_water_notes TEXT,            -- 水电自持能力备注（如：400Ah锂电 + 100L清水箱）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 营地主表
CREATE TABLE campsites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    wgs84_lat DOUBLE PRECISION NOT NULL, -- 标准 GPS 纬度
    wgs84_lng DOUBLE PRECISION NOT NULL, -- 标准 GPS 经度
    gcj02_lat DOUBLE PRECISION NOT NULL, -- 火星坐标系 纬度
    gcj02_lng DOUBLE PRECISION NOT NULL, -- 火星坐标系 经度
    category VARCHAR(30),               -- 地形分类：湖边/山林/海边/桥下/服务区
    source_origin VARCHAR(50),          -- 数据来源：小红书/高德/车友爆料
    original_url TEXT,                  -- 原始导入链接
    current_status VARCHAR(30) DEFAULT '开放', -- 开放 / 季节性关闭 / 封路 / 禁营
    last_verified_at TIMESTAMP WITH TIME ZONE, -- 最后一次车友打卡确认时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 结构化点评表（绑定车型快照）
CREATE TABLE campsite_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campsite_id UUID REFERENCES campsites(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    vehicle_snapshot JSONB,              -- 点评时用户的车型尺寸数据快照
    facilities_json JSONB,               -- 设施勾选项：{water: true, toilet: true, power: false}
    measured_height_limit INT,          -- 车友实测限高 (cm)
    flatness_rating INT CHECK (flatness_rating BETWEEN 1 AND 5), -- 地面平整度评分
    content TEXT,                       -- 文字体验评价
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 营地图库表
CREATE TABLE campsite_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campsite_id UUID REFERENCES campsites(id) ON DELETE CASCADE,
    review_id UUID REFERENCES campsite_reviews(id) ON DELETE SET NULL,
    storage_url TEXT NOT NULL,           -- 图片存储服务 URL
    source_type VARCHAR(20),            -- 来源：小红书扒取 / 车友实拍
    ai_tag VARCHAR(30),                 -- AI 分类：全景 / 路况 / 设施 / 避坑
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

# **五、 技术栈推荐与落地路线**

## **5.1 架构方案**

* **前端框架与地图**：React \+ Tailwind CSS，地图端集成高德 JS API 与 Leaflet。  
* **移动端打包**：使用 **Capacitor** 或 **Tauri 2.0** 构建 Android 原生包。直接调用 Android 原生 API 实现系统级 Share Intent 监听，同时依靠本地 SQLite 数据库实现无网络环境下的离线地图数据查询。  
* **后端服务与存储**：**Python (FastAPI) \+ PostgreSQL ( PostGIS )** 或 **SQLite**。协同 S3 兼容的对象存储存放高效压缩后的实景图片。

## **5.2 分阶段实施计划**

```
Phase 1: 基础 MVP 阶段 ───► Phase 2: 智能增强阶段 ───► Phase 3: 社区众包阶段
 └─ 多源链接解析/地图展示    └─ 小红书解析/AI车型反查    └─ 现场打卡/实时动态维护
 └─ URI Scheme 拉起导航      └─ 车身尺寸对比预警看板    └─ EXIF坐标自动校准
```

* **Phase 1（个人 MVP 版）**  
  * 完成高德、百度、Google 短链解析引擎与坐标转换模块。  
  * 实现基于前端地图的坐标点标注及一键唤醒第三方导航应用。  
* **Phase 2（AI 辅助与风险预警）**  
  * 接入小红书图文解析与 AI 提取算法。  
  * 上线车型数据库与自动反查补全逻辑，推出营地"尺寸差值预警看板"。  
* **Phase 3（车友社区与生态打卡）**  
  * 开放用户登录系统与多端打卡机制。  
  * 引入基于照片 EXIF 信息的坐标自动校验与营地实时状态更新流。

