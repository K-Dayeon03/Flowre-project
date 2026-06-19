package com.flowre.server.domain.store.service;

import com.flowre.server.domain.store.dto.AddressSearchResponse;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class KakaoAddressSearchServiceTest {

    private KakaoAddressSearchService kakaoAddressSearchService;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        kakaoAddressSearchService = new KakaoAddressSearchService(builder);
    }

    @Test
    void restApiKey가_없으면_STORE_004를_던진다() {
        ReflectionTestUtils.setField(kakaoAddressSearchService, "restApiKey", "");

        assertThatThrownBy(() -> kakaoAddressSearchService.search("양녕로 117"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.KAKAO_API_KEY_MISSING);
    }

    @Test
    void 카카오_API_오류는_STORE_005로_변환한다() {
        ReflectionTestUtils.setField(kakaoAddressSearchService, "restApiKey", "bad-key");
        server.expect(requestTo(containsString("/v2/local/search/address.json")))
                .andExpect(header("Authorization", "KakaoAK bad-key"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":\"unauthorized\"}"));

        assertThatThrownBy(() -> kakaoAddressSearchService.search("양녕로 117"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.KAKAO_ADDRESS_SEARCH_FAILED);
        server.verify();
    }

    @Test
    void 카카오_주소_검색_결과를_우편번호_주소_좌표로_변환한다() {
        ReflectionTestUtils.setField(kakaoAddressSearchService, "restApiKey", "valid-key");
        server.expect(requestTo(containsString("/v2/local/search/address.json")))
                .andExpect(header("Authorization", "KakaoAK valid-key"))
                .andRespond(withSuccess("""
                        {
                          "documents": [
                            {
                              "address_name": "서울 관악구 봉천동 123",
                              "x": "126.9500",
                              "y": "37.4800",
                              "road_address": {
                                "address_name": "서울 관악구 양녕로 117",
                                "zone_no": "08750",
                                "x": "126.9501",
                                "y": "37.4801"
                              },
                              "address": {
                                "address_name": "서울 관악구 봉천동 123",
                                "x": "126.9500",
                                "y": "37.4800"
                              }
                            }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        List<AddressSearchResponse> results = kakaoAddressSearchService.search("양녕로 117");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getPostalCode()).isEqualTo("08750");
        assertThat(results.get(0).getRoadAddress()).isEqualTo("서울 관악구 양녕로 117");
        assertThat(results.get(0).getJibunAddress()).isEqualTo("서울 관악구 봉천동 123");
        assertThat(results.get(0).getLatitude()).isEqualTo(37.4801);
        assertThat(results.get(0).getLongitude()).isEqualTo(126.9501);
        server.verify();
    }
}
