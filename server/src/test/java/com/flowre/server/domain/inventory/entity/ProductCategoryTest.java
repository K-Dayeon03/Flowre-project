package com.flowre.server.domain.inventory.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/** 상품명 키워드 기반 카테고리 분류 우선순위 검증. */
class ProductCategoryTest {

    @DisplayName("상품명 키워드로 카테고리를 분류한다 (우선순위 포함)")
    @ParameterizedTest(name = "[{index}] \"{0}\" → {1}")
    @CsvSource({
            // 자켓: 팬츠(데님)·아우터보다 우선해 자켓으로 분류
            "여 데님 자켓,JACKET",
            "여 코듀로이 카라 다운필 자켓,JACKET",
            "남 코튼 체크 셔켓,JACKET",
            "여 루즈핏 데님 셔켓,JACKET",
            // 아우터: 점퍼/패딩/베스트/판초/브레이커 등
            "여 라이트 다운필 베스트,OUTER",
            "남녀공용 베이직 푸퍼 점퍼,OUTER",
            "여 루즈핏 후드 레인 판초,OUTER",
            "남 사각사각 윈드 브레이커,OUTER",
            "여 후드 숏 점퍼,OUTER",
            // 데님 점퍼는 자켓 키워드가 없으므로 아우터(점퍼)로 분류
            "여 데님 점퍼,OUTER",
            // 팬츠: 자켓 키워드 없는 데님/바지/슬랙스
            "여 와이드 데님 팬츠,PANTS",
            "남 코튼 슬랙스,PANTS",
            // 스커트
            "여 데님 미니 스커트,SKIRT",
            // 원피스
            "여 니트 원피스,DRESS",
            // 블라우스/셔츠 (셔켓과 구분)
            "여 프릴 블라우스,BLOUSE",
            "남 옥스포드 셔츠,BLOUSE",
            // 니트(스웨터) vs 티셔츠(스웨트) 구분
            "여 케이블 스웨터,KNIT",
            "남 크루넥 스웨트,TSHIRT",
            "여 베이직 맨투맨,TSHIRT",
            // 분류 불가 → 기타
            "여 실크 스카프,ETC",
    })
    void classify(String productName, ProductCategory expected) {
        assertThat(ProductCategory.classify(productName)).isEqualTo(expected);
    }

    @DisplayName("빈 상품명은 기타로 분류한다")
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void classifyBlank(String productName) {
        assertThat(ProductCategory.classify(productName)).isEqualTo(ProductCategory.ETC);
    }
}
