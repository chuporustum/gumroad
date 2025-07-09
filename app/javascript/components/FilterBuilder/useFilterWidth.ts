import React from "react";

export type FilterComplexity = "simple" | "date" | "product";

export interface FilterWidthConfig {
  filterComplexity: FilterComplexity;
  containerWidth: string;
  formMinWidth: string;
  isWideLayout: boolean;
}

interface FilterGroup {
  filters: Array<{
    filter_type: "date" | "product" | "payment" | "location" | "email_engagement";
  }>;
}

export const useFilterWidth = (filterGroups?: FilterGroup[]): FilterWidthConfig => {
  const filterComplexity = React.useMemo((): FilterComplexity => {
    if (!filterGroups) return "simple";

    const hasProductFilters = filterGroups.some((group) =>
      group.filters.some((filter) => filter.filter_type === "product"),
    );

    if (hasProductFilters) return "product";

    const hasDateFilters = filterGroups.some((group) => group.filters.some((filter) => filter.filter_type === "date"));

    if (hasDateFilters) return "date";

    return "simple";
  }, [filterGroups]);

  const containerWidth = React.useMemo(
    () => (filterComplexity === "product" || filterComplexity === "date" ? "1200px" : "1050px"),
    [filterComplexity],
  );

  const formMinWidth = React.useMemo(
    () => (filterComplexity === "product" || filterComplexity === "date" ? "1100px" : "600px"),
    [filterComplexity],
  );

  const isWideLayout = filterComplexity !== "simple";

  return {
    filterComplexity,
    containerWidth,
    formMinWidth,
    isWideLayout,
  };
};
