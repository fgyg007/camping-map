package com.jlmac.campingmap;

import java.math.BigDecimal;

/** Baidu marker URI builders: only the saved WGS-84 point leaves the app. */
final class BaiduMarker {
    static final String PACKAGE = "com.baidu.BaiduMap";
    private static final String TITLE = "%E9%87%8E%E6%B3%8A%E8%90%A5%E5%9C%B0";

    private static final String WEB_CONTENT = "%E5%B7%B2%E4%BF%9D%E5%AD%98%E7%9A%84%E8%90%A5%E5%9C%B0%E5%9D%90%E6%A0%87";

    private BaiduMarker() {}

    static boolean valid(Double lat, Double lng) {
        return lat != null && lng != null && Double.isFinite(lat) && Double.isFinite(lng) &&
            Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    }

    private static String point(Double lat, Double lng) {
        if (!valid(lat, lng)) throw new IllegalArgumentException("invalid_baidu_destination");
        return "location=" + BigDecimal.valueOf(lat).toPlainString() + "," +
            BigDecimal.valueOf(lng).toPlainString() + "&coord_type=wgs84&title=" + TITLE;
    }

    static String app(Double lat, Double lng) {
        return "baidumap://map/marker?" + point(lat, lng) + "&src=andr.jlmac.campingmap";
    }

    static String web(Double lat, Double lng) {
        return "https://api.map.baidu.com/marker?" + point(lat, lng) +
            "&content=" + WEB_CONTENT + "&output=html&src=webapp.jlmac.campingmap";
    }
}
