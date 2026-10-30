"use client";

import { useState } from "react";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export function usePagination(total: number, initialPage = 1, perPage = ITEMS_PER_PAGE) {
    const [page, setPage] = useState(initialPage);
    const totalPages = Math.ceil(total / perPage);

    const goToPage = (p: number) => {
        if (p >= 1 && p <= totalPages) setPage(p);
    };

    return {
        page,
        perPage,
        totalPages,
        offset: (page - 1) * perPage,
        goToPage,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        goToPrev: () => goToPage(page - 1),
        goToNext: () => goToPage(page + 1),
    };
}
