package com.jlmac.campingmap;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.fail;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class ExternalMapRedirectsTest {
    @Test public void readsOnlyOneTerminalRoutingHeader() throws Exception {
        List<String> requests = new ArrayList<>();
        String url = "https://j.map.baidu.com/4f/Example";
        String expanded = "http://api.map.baidu.com/marker?location=39,116&coord_type=wgs84";
        assertEquals(expanded, ExternalMapRedirects.resolve(url, uri -> {
            requests.add(uri.toString());
            return expanded;
        }));
        assertEquals(Arrays.asList(url), requests);
    }

    @Test public void desktopBaiduRedirectIsReturnedAsDataAndNeverFetched() throws Exception {
        List<String> requests = new ArrayList<>();
        String url = "https://j.map.baidu.com/4f/Example";
        String expanded = "https://map.baidu.com/poi/Test/@12958175,4825923,19z?uid=SyntheticExample";
        assertEquals(expanded, ExternalMapRedirects.resolve(url, uri -> {
            requests.add(uri.toString());
            return expanded;
        }));
        assertEquals(Arrays.asList(url), requests);
    }

    @Test public void allowsOneSameProviderHopWithoutTracking() throws Exception {
        List<String> requests = new ArrayList<>();
        String url = "https://goo.gl/maps/Example";
        String next = "https://maps.app.goo.gl/Next";
        String expanded = "https://www.google.com/maps/search/?api=1&query=-33,151";
        assertEquals(expanded, ExternalMapRedirects.resolve(url, uri -> {
            requests.add(uri.toString());
            return requests.size() == 1 ? next + "?g_st=ic" : expanded;
        }));
        assertEquals(Arrays.asList(url, next), requests);
    }

    @Test public void acceptsExactTencentHeaderWithoutVisitingDestination() throws Exception {
        String start = "https://mmapgwh.map.qq.com/shortlink/short?l=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        String target = "https://map.qq.com/m/map-app/share/poi?coord=116,39&n=Synthetic";
        List<String> requests = new ArrayList<>();
        assertEquals(target, ExternalMapRedirects.resolve(start, uri -> {
            requests.add(uri.toString());
            return target;
        }));
        assertEquals(Arrays.asList(start), requests);
        try {
            ExternalMapRedirects.resolve(start + "&next=https://example.invalid", uri -> {
                fail("must not request unapproved short-link parameters");
                return null;
            });
            fail("must reject unapproved parameters");
        } catch (IllegalArgumentException expected) {
            assertEquals("invalid_external_map_link", expected.getMessage());
        }
    }

    @Test public void refusesUnexpectedDestinationsWithoutFetchingThem() throws Exception {
        for (String target : Arrays.asList(
                "https://example.com/maps/place/Test",
                "https://j.map.baidu.com/0/Next",
                "https://www.google.com.evil/maps/place/Test",
                "https://user@www.google.com/maps/place/Test",
                "http://www.google.com/maps/place/Test",
                "https://www.google.com:443/maps/place/Test",
                "/maps/place/Test",
                "https://maps.app.goo.gl/Example")) {
            List<String> requests = new ArrayList<>();
            String input = "https://maps.app.goo.gl/Example";
            try {
                ExternalMapRedirects.resolve(input, uri -> {
                    requests.add(uri.toString());
                    return target;
                });
                fail(target);
            } catch (IOException expected) {
                assertEquals(Arrays.asList(input), requests);
            }
        }
    }

    @Test public void boundsSameProviderRedirectsAndRejectsInvalidInput() throws Exception {
        List<String> requests = new ArrayList<>();
        String input = "https://maps.app.goo.gl/Example";
        String next = "https://maps.app.goo.gl/Next";
        try {
            ExternalMapRedirects.resolve(input, uri -> {
                requests.add(uri.toString());
                return requests.size() == 1 ? next : "https://maps.app.goo.gl/Third";
            });
            fail("must not request third redirect");
        } catch (IOException expected) {
            assertEquals(Arrays.asList(input, next), requests);
        }
        try {
            ExternalMapRedirects.resolve("http://j.map.baidu.com/Example", uri -> {
                fail("must not fetch HTTP");
                return null;
            });
            fail("must reject HTTP");
        } catch (IllegalArgumentException expected) {
            assertEquals("invalid_external_map_link", expected.getMessage());
        }
    }
}
