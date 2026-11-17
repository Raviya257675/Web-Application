package com.meridian.hms.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * One response envelope for every endpoint:
 * success -> { success: true, data, meta? }
 * failure -> { success: false, error: { message, code, details? } }
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(boolean success, T data, PageMeta meta, ApiError error) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static <T> ApiResponse<T> page(T data, PageMeta meta) {
        return new ApiResponse<>(true, data, meta, null);
    }

    public static ApiResponse<Void> fail(String code, String message, List<String> details) {
        return new ApiResponse<>(false, null, null, new ApiError(message, code, details));
    }

    public static ApiResponse<Void> fail(String code, String message) {
        return fail(code, message, null);
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PageMeta(int page, int limit, long total, int totalPages) {
        public static PageMeta of(int page, int limit, long total) {
            int pages = limit <= 0 ? 0 : (int) Math.ceil((double) total / limit);
            return new PageMeta(page, limit, total, pages);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ApiError(String message, String code, List<String> details) {
    }
}
