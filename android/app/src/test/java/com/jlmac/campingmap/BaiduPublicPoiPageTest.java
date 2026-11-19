package com.jlmac.campingmap;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class BaiduPublicPoiPageTest {
    private static final String UID = "public-test_UID";
    private static final String LOCATION = "https://map.baidu.com/mobile/webapp/search/search/qt=inf&uid=" +
        UID + "/newmap=1&sharecallbackflag=poiDetailPage&vt=map&da_from=weixin&openna=1";
    private static final String RECORD = "{\"content\":{\"uid\":\"" + UID +
        "\",\"name\":\"公开点 / ?\",\"geo\":\"1|111,222;\",\"ext\":{\"detail_info\":" +
        "{\"point\":{\"x\":\"12956123.40\",\"y\":\"4837456.70\"}},\"navi_x\":\"12345\"}}," +
        "\"uid\":\"" + UID + "\",\"result\":{\"type\":6}}";

    private static String page(String json) {
        return "<html><head><title>地图测试页</title></head><script>\n(function(){\n" +
            "  var dataAll = " + json + ";\n" +
            "  require(\"place:widget/detailpoicard/detailpoicard.js\").init({data: dataAll});\n" +
            "})()</script></html>";
    }

    @Test public void publicUriIsAlwaysFirstPartyFixedRoute() {
        assertEquals("map.baidu.com", BaiduPublicPoiPage.pageUri(LOCATION, UID).getHost());
        assertTrue(BaiduPublicPoiPage.pageUri(LOCATION, UID).getRawPath().contains("uid=" + UID + "/"));
        assertNull(BaiduPublicPoiPage.pageUri(LOCATION.replace("map.baidu.com", "not-baidu.invalid"), UID));
        assertNull(BaiduPublicPoiPage.pageUri(LOCATION.replace("https:", "http:"), UID));
        assertNull(BaiduPublicPoiPage.pageUri(LOCATION + "#section", UID));
        assertNull(BaiduPublicPoiPage.pageUri(LOCATION + "?other=1", UID));
        assertNull(BaiduPublicPoiPage.pageUri(LOCATION, "test%2f.."));
        assertNull(BaiduPublicPoiPage.pageUri(LOCATION, "not-expected"));
    }

    @Test public void extractsPinWithoutUsingCenterOrNavigationPoint() {
        BaiduPublicPoiPage.Point point = BaiduPublicPoiPage.parsePage(page(RECORD), UID);
        assertNotNull(point);
        assertEquals("公开点 / ?", point.name);
        assertEquals(12956123.40, point.x, 0.0001);
        assertEquals(4837456.70, point.y, 0.0001);
        assertEquals(UID, point.uid);
    }

    @Test public void rejectsDifferentUidDuplicateOrMissingRecord() {
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD), "not-expected"));
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD.replace("\"content\":{\"uid\":\"" + UID,
            "\"content\":{\"uid\":\"different")), UID));
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD) + page(RECORD), UID));
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD).replace("detailpoicard.js", "other.js"), UID));
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD).replace("</script>", ""), UID));
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD).replace("ext", "no_ext"), UID));
    }

    @Test public void rejectsBlockedPageJavascriptAndInvalidCoordinates() {
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD).replace("地图测试页", "百度安全验证"), UID));
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD.replace("\"12956123.40\"", "lookUp()")), UID));
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD.replace("12956123.40", "21499999")), UID));
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD.replace("4837456.70", "NaN")), UID));
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD.replace("公开点 / ?", "")), UID));
        assertNull(BaiduPublicPoiPage.parsePage(page(RECORD).replace("<script>", "<script src=\"https://map.baidu.com/example.js\">"), UID));
    }

    @Test public void restrictsDocumentType() {
        assertTrue(BaiduPublicPoiPage.acceptsHtml("text/html; charset=UTF-8"));
        assertTrue(BaiduPublicPoiPage.acceptsHtml("text/html;charset=\"utf-8\""));
        assertFalse(BaiduPublicPoiPage.acceptsHtml("text/html; charset=latin1"));
        assertFalse(BaiduPublicPoiPage.acceptsHtml("text/javascript"));
        assertFalse(BaiduPublicPoiPage.acceptsHtml(null));
    }
}
