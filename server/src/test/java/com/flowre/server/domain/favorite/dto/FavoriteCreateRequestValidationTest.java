package com.flowre.server.domain.favorite.dto;

import com.flowre.server.domain.favorite.entity.FavoriteTargetType;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class FavoriteCreateRequestValidationTest {

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    @Test
    void menuFavoriteRequiresTargetKey() {
        FavoriteCreateRequest request = request(FavoriteTargetType.MENU, null, " ", null);

        assertThat(validator.validate(request))
                .anyMatch(violation -> violation.getPropertyPath().toString().equals("validTargetReference"));
    }

    @Test
    void nonMenuFavoriteRequiresTargetId() {
        FavoriteCreateRequest request = request(FavoriteTargetType.DOCUMENT, null, null, null);

        assertThat(validator.validate(request))
                .anyMatch(violation -> violation.getPropertyPath().toString().equals("validTargetReference"));
    }

    @Test
    void validFavoritesPassTypeSpecificTargetValidation() {
        FavoriteCreateRequest menu = request(FavoriteTargetType.MENU, null, "chat", "채팅");
        FavoriteCreateRequest document = request(FavoriteTargetType.DOCUMENT, 1L, null, "문서");

        assertThat(validator.validate(menu)).isEmpty();
        assertThat(validator.validate(document)).isEmpty();
    }

    private FavoriteCreateRequest request(FavoriteTargetType targetType, Long targetId, String targetKey, String label) {
        FavoriteCreateRequest request = new FavoriteCreateRequest();
        ReflectionTestUtils.setField(request, "targetType", targetType);
        ReflectionTestUtils.setField(request, "targetId", targetId);
        ReflectionTestUtils.setField(request, "targetKey", targetKey);
        ReflectionTestUtils.setField(request, "label", label);
        return request;
    }
}
