package com.jlmac.campingmap;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.net.URI;
import org.junit.Test;

public class BaiduMarkerTest {
    @Test public void appAndWebCarryTheSameExplicitWgs84Marker() {
        URI app = URI.create(BaiduMarker.app(25.125, 102.875));
        URI web = URI.create(BaiduMarker.web(25.125, 102.875));
        assertEquals("com.baidu.BaiduMap", BaiduMarker.PACKAGE);
        assertEquals("baidumap", app.getScheme());
        assertEquals("map", app.getHost());
        assertEquals("https", web.getScheme());
        assertEquals("api.map.baidu.com", web.getHost());
        for (URI uri : new URI[]{ app, web }) {
            assertEquals("/marker", uri.getPath());
            assertTrue(uri.getQuery().startsWith("location=25.125,102.875&coord_type=wgs84&title=野泊营地&"));
        }
        assertFalse(app.getQuery().contains("content="));
        assertTrue(web.getQuery().contains("&content=已保存的营地坐标&"));
        assertTrue(app.getQuery().endsWith("src=andr.jlmac.campingmap"));
        assertTrue(web.getQuery().endsWith("output=html&src=webapp.jlmac.campingmap"));
    }

    @Test public void invalidAndTinyCoordinatesDoNotChangeTheRequestShape() {
        assertFalse(BaiduMarker.valid(90.00001, 0.0));
        assertFalse(BaiduMarker.valid(0.0, Double.NaN));
        assertFalse(BaiduMarker.valid(null, 5.0));
        assertTrue(BaiduMarker.valid(-90.0, 180.0));
        assertTrue(BaiduMarker.app(0.0000001, -0.0000001).contains("location=0.00000010,-0.00000010&"));
        try {
            BaiduMarker.web(30.0, 181.0);
            fail("Must reject invalid longitude");
        } catch (IllegalArgumentException expected) {
            assertEquals("invalid_baidu_destination", expected.getMessage());
        }
    }
}
