package com.flowre.server.domain.user.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserRoleTest {

    @Test
    void headquartersRolesAreHqStaffAndAdmin() {
        assertThat(UserRole.HQ_STAFF.isHeadquarters()).isTrue();
        assertThat(UserRole.ADMIN.isHeadquarters()).isTrue();
        assertThat(UserRole.STORE_MANAGER.isHeadquarters()).isFalse();
        assertThat(UserRole.STORE_STAFF.isHeadquarters()).isFalse();
    }

    @Test
    void onlyHeadquartersCanViewAllStoresAndManage() {
        for (UserRole role : UserRole.values()) {
            assertThat(role.canViewAllStores()).isEqualTo(role.isHeadquarters());
            assertThat(role.canManage()).isEqualTo(role.isHeadquarters());
        }
    }

    @Test
    void noticeCanBeCreatedByManagerAndAbove() {
        assertThat(UserRole.STORE_MANAGER.canCreateNotice()).isTrue();
        assertThat(UserRole.HQ_STAFF.canCreateNotice()).isTrue();
        assertThat(UserRole.ADMIN.canCreateNotice()).isTrue();
        assertThat(UserRole.STORE_STAFF.canCreateNotice()).isFalse();
    }
}
