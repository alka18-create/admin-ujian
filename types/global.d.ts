export type ApiResponse<T = unknown> = {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
};

export type PaginatedResponse<T> = {
    data: T[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
};

export type SortOrder = "asc" | "desc";
