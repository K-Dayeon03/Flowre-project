package com.flowre.server.domain.schedule.service;

import com.flowre.server.domain.schedule.dto.ScheduleRequest;
import com.flowre.server.domain.schedule.dto.ScheduleResponse;
import com.flowre.server.domain.schedule.dto.ScheduleUpdateRequest;
import com.flowre.server.domain.schedule.entity.Schedule;
import com.flowre.server.domain.schedule.entity.ScheduleStatus;
import com.flowre.server.domain.schedule.repository.ScheduleRepository;
import com.flowre.server.domain.user.entity.User;
import com.flowre.server.global.exception.CustomException;
import com.flowre.server.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;

    /**
     * 스케줄 목록 조회 — brandId로 격리, status 필터 선택
     */
    @Transactional(readOnly = true)
    public List<ScheduleResponse> getList(User user, ScheduleStatus status) {
        List<Schedule> schedules = status != null
                ? scheduleRepository.findByBrandIdAndStatusOrderByCreatedAtDesc(user.getBrandId(), status)
                : scheduleRepository.findByBrandIdOrderByCreatedAtDesc(user.getBrandId());

        return schedules.stream().map(ScheduleResponse::from).toList();
    }

    /**
     * 스케줄 단건 조회
     */
    @Transactional(readOnly = true)
    public ScheduleResponse getById(User user, Long id) {
        Schedule schedule = scheduleRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.SCHEDULE_NOT_FOUND));
        return ScheduleResponse.from(schedule);
    }

    /**
     * 스케줄 생성
     */
    @Transactional
    public ScheduleResponse create(User user, ScheduleRequest request) {
        Schedule schedule = Schedule.builder()
                .title(request.getTitle())
                .type(request.getType())
                .dueDate(request.getDueDate())
                .assignee(request.getAssignee())
                .description(request.getDescription())
                .storeId(user.getStoreId())
                .brandId(user.getBrandId())
                .createdBy(user.getName())
                .build();

        return ScheduleResponse.from(scheduleRepository.save(schedule));
    }

    /**
     * 스케줄 수정
     */
    @Transactional
    public ScheduleResponse update(User user, Long id, ScheduleUpdateRequest request) {
        Schedule schedule = scheduleRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.SCHEDULE_NOT_FOUND));

        schedule.update(request.getTitle(), request.getType(),
                request.getDueDate(), request.getAssignee(), request.getDescription());

        return ScheduleResponse.from(schedule);
    }

    /**
     * 스케줄 완료 처리
     */
    @Transactional
    public void complete(User user, Long id) {
        Schedule schedule = scheduleRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.SCHEDULE_NOT_FOUND));

        if (schedule.getStatus() == ScheduleStatus.DONE) {
            throw new CustomException(ErrorCode.SCHEDULE_ALREADY_DONE);
        }

        schedule.complete();
    }

    /**
     * 스케줄 삭제
     */
    @Transactional
    public void delete(User user, Long id) {
        Schedule schedule = scheduleRepository.findByIdAndBrandId(id, user.getBrandId())
                .orElseThrow(() -> new CustomException(ErrorCode.SCHEDULE_NOT_FOUND));
        scheduleRepository.delete(schedule);
    }
}
