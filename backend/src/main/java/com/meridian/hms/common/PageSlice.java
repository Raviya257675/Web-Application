package com.meridian.hms.common;

import java.util.List;

/** A page of rows plus the envelope metadata. */
public record PageSlice<T>(List<T> items, ApiResponse.PageMeta meta) {

    public static <T> PageSlice<T> of(List<T> all, int page, int limit) {
        int safeLimit = limit <= 0 ? 20 : Math.min(limit, 500);
        int safePage = Math.max(page, 1);
        int from = Math.min((safePage - 1) * safeLimit, all.size());
        int to = Math.min(from + safeLimit, all.size());
        return new PageSlice<>(all.subList(from, to),
                ApiResponse.PageMeta.of(safePage, safeLimit, all.size()));
    }
}
