package com.flowre.server.domain.store.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.flowre.server.domain.store.dto.AddressSearchResponse;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class KakaoAddressSearchService {

    private static final String KAKAO_ADDRESS_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/address.json";

    private final RestClient.Builder restClientBuilder;

    @Value("${flowre.kakao.rest-api-key:}")
    private String restApiKey;

    /** 카카오 로컬 API로 주소를 검색하고, 우편번호·주소·좌표 정보를 반환합니다. */
    public List<AddressSearchResponse> search(String query) {
        if (restApiKey == null || restApiKey.isBlank()) {
            throw new CustomException(ErrorCode.KAKAO_API_KEY_MISSING);
        }

        JsonNode body;
        try {
            body = restClientBuilder.build()
                    .get()
                    .uri(KAKAO_ADDRESS_SEARCH_URL, uriBuilder -> uriBuilder
                            .queryParam("query", query.trim())
                            .queryParam("size", 10)
                            .build())
                    .header("Authorization", "KakaoAK " + restApiKey)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientResponseException e) {
            throw new CustomException(ErrorCode.KAKAO_ADDRESS_SEARCH_FAILED, e);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.KAKAO_ADDRESS_SEARCH_FAILED, e);
        }

        JsonNode documents = body == null ? null : body.get("documents");
        if (documents == null || !documents.isArray()) {
            return List.of();
        }

        List<AddressSearchResponse> results = new ArrayList<>();
        for (JsonNode document : documents) {
            JsonNode road = document.get("road_address");
            JsonNode address = document.get("address");
            String roadAddress = text(road, "address_name");
            String jibunAddress = text(address, "address_name");
            String postalCode = text(road, "zone_no");
            String latitude = firstText(text(road, "y"), text(document, "y"), text(address, "y"));
            String longitude = firstText(text(road, "x"), text(document, "x"), text(address, "x"));

            results.add(AddressSearchResponse.builder()
                    .postalCode(postalCode)
                    .roadAddress(firstText(roadAddress, text(document, "address_name")))
                    .jibunAddress(jibunAddress)
                    .latitude(parseDouble(latitude))
                    .longitude(parseDouble(longitude))
                    .build());
        }
        return results;
    }

    private String text(JsonNode node, String field) {
        if (node == null || node.isNull()) {
            return "";
        }
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? "" : value.asText("");
    }

    private String firstText(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private Double parseDouble(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return Double.valueOf(value);
    }
}
