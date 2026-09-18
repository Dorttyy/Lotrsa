export interface CallFilters {
  country: string;
  native_language: string;
  gender: string;
  age_group: string;
  level: string;
  has_avatar: boolean;
}

export const EMPTY_CALL_FILTERS: CallFilters = {
  country: "", native_language: "", gender: "", age_group: "", level: "", has_avatar: false,
};

export const activeFilterCount = (filters: CallFilters) => Object.values(filters).filter(Boolean).length;

export const filterQuery = (filters: CallFilters) => Object.entries(filters)
  .filter(([, value]) => Boolean(value))
  .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
  .join("&");