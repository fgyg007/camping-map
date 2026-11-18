package com.jlmac.campingmap;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import org.junit.Test;

public class BaiduPoiCandidatePolicyTest {
    private static final String UID = "SyntheticPoi";
    private static final String REF = "https://map.baidu.com/?newmap=1&s=inf%26uid%3D" + UID +
        "&sharecallbackflag=poiDetailPage";
    private static final String POI = "https://map.baidu.com/poi/PublicSynthetic/@12958175,4825923,19z?uid=" + UID;

    @Test public void knownReferenceBuildsMinimumPublicHttpsUrl() {
        assertEquals(UID, BaiduPoiCandidatePolicy.referenceUid(REF + "&ignored=tracking"));
        assertEquals(REF, BaiduPoiCandidatePolicy.publicPage(UID));
        assertTrue(BaiduPoiCandidatePolicy.allowsNavigation(REF, UID));
        assertNull(BaiduPoiCandidatePolicy.publicPage("wrong&uid=other"));
        assertNull(BaiduPoiCandidatePolicy.referenceUid(
            "https://map.baidu.com/?s=inf%26uid%3D" + UID + "&s=inf%26uid%3Dbad"));
        assertNull(BaiduPoiCandidatePolicy.referenceUid(
            "https://map.baidu.com/?s=inf%26uid%3D" + UID + "%26fake%3Dcontext"));
    }

    @Test public void matchedPoiViewReturnsOnlyValidatedPathAndUid() {
        String result = BaiduPoiCandidatePolicy.candidate(POI + "&discard=tracking", UID);
        assertEquals(POI + "&querytype=detailConInfo", result);
        assertTrue(BaiduPoiCandidatePolicy.allowsNavigation(result, UID));
        assertNull(BaiduPoiCandidatePolicy.candidate(POI, "DifferentUid"));
        assertNull(BaiduPoiCandidatePolicy.candidate(POI + "&%75id=DifferentUid", UID));
        assertNull(BaiduPoiCandidatePolicy.candidate(REF, UID));
    }

    @Test public void rejectsInvalidAndUnrelatedNavigation() {
        for (String invalid : new String[] {
            "http://map.baidu.com/poi/P/@12958175,4825923,19z?uid=" + UID,
            POI.replace("map.baidu.com", "map.baidu.com.evil.test"),
            POI.replace("map.baidu.com", "user@map.baidu.com"),
            POI.replace("map.baidu.com", "map.baidu.com:443"),
            POI + "#hidden",
            POI.replace("12958175", "999999999999"),
            POI.replace("4825923", "NaN"),
            POI.replace("19z", "40z"),
            "https://map.baidu.com/@12958175,4825923,19z?uid=" + UID,
            "https://map.baidu.com/login?uid=" + UID,
            "https://passport.baidu.com/",
            "javascript:alert(1)",
            "file:///android_asset/index.html"
        }) assertFalse(invalid, BaiduPoiCandidatePolicy.allowsNavigation(invalid, UID));
    }

    @Test public void resourceScopeIsReadOnlyExactAndWithoutAccountHosts() {
        assertTrue(BaiduPoiCandidatePolicy.allowsResource("https://api.map.baidu.com/safe", "GET"));
        assertTrue(BaiduPoiCandidatePolicy.allowsResource("https://maponline0.bdimg.com/tile", "HEAD"));
        for (String host : new String[] {"fex.bdstatic.com", "ss0.bdstatic.com", "webmap0.bdimg.com",
                "map-mobile-static.cdn.bcebos.com", "map-mobile-resource.cdn.bcebos.com"}) {
            assertTrue(BaiduPoiCandidatePolicy.allowsResource("https://" + host + "/map.js", "GET"));
            assertFalse(BaiduPoiCandidatePolicy.allowsNavigation(POI.replace("map.baidu.com", host), UID));
        }
        assertFalse(BaiduPoiCandidatePolicy.allowsResource("https://map.baidu.com/", "POST"));
        assertFalse(BaiduPoiCandidatePolicy.allowsResource("https://passport.baidu.com/", "GET"));
        assertFalse(BaiduPoiCandidatePolicy.allowsResource("https://dlswbr.baidu.com/start", "GET"));
        assertFalse(BaiduPoiCandidatePolicy.allowsResource("https://miao.baidu.com/script.js", "GET"));
        assertFalse(BaiduPoiCandidatePolicy.allowsResource("https://map.baidu.com/login/account", "GET"));
        assertFalse(BaiduPoiCandidatePolicy.allowsResource("https://map.baidu.com/%6cogin", "GET"));
        assertFalse(BaiduPoiCandidatePolicy.allowsResource("https://api.map.baidu.com/oauth2/token", "GET"));
        assertFalse(BaiduPoiCandidatePolicy.allowsResource("https://webmap0.bdimg.com/download/app", "GET"));
        assertFalse(BaiduPoiCandidatePolicy.allowsResource("https://api.map.baidu.com.evil.test/", "GET"));
        assertFalse(BaiduPoiCandidatePolicy.allowsResource("http://map.baidu.com/", "GET"));
        assertFalse(BaiduPoiCandidatePolicy.allowsResource("content://com.jlmac.campingmap.fileprovider/", "GET"));
    }
}
