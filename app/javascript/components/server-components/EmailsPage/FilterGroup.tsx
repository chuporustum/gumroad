import React from "react";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";

import { FilterRow, type FilterConfig } from "./FilterRow";

export interface FilterGroup {
  id: string;
  filters: FilterConfig[];
}

interface FilterGroupProps {
  group: FilterGroup;
  onUpdate: (group: FilterGroup) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const FilterGroup: React.FC<FilterGroupProps> = ({ group, onUpdate, onRemove, canRemove }) => {
  const updateFilter = (index: number, filter: FilterConfig) => {
    const newFilters = [...group.filters];
    newFilters[index] = filter;
    onUpdate({
      ...group,
      filters: newFilters,
    });
  };

  const removeFilter = (index: number) => {
    onUpdate({
      ...group,
      filters: group.filters.filter((_, i) => i !== index),
    });
  };

  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        border: "2px solid var(--color-border)",
        borderRadius: "12px",
        position: "relative",
        width: "100%",
        padding: "20px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        boxSizing: "border-box",
      }}
    >
      {canRemove ? (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "16px",
            padding: "20px 20px 0 20px",
          }}
        >
          <Button onClick={onRemove} color="danger" outline small aria-label="Remove filter group">
            <Icon name="trash2" />
            Remove Group
          </Button>
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "flex-end", padding: "20px" }}>
        {group.filters.map((filter, index) => (
          <FilterRow
            key={index}
            filter={filter}
            onUpdate={(updatedFilter) => updateFilter(index, updatedFilter)}
            onRemove={() => removeFilter(index)}
            canRemove={group.filters.length > 1}
            isFirstRow={index === 0}
          />
        ))}
      </div>

      <Button
        outline
        onClick={() => {
          const newFilter: FilterConfig = {
            filter_type: "payment",
            operator: "is_more_than",
            value: { amount: "0" },
            connector: group.filters.length === 0 ? null : "and",
          } as const;

          onUpdate({
            ...group,
            filters: [...group.filters, newFilter],
          });
        }}
        style={{ width: "96%", marginTop: "16px" }}
      >
        <Icon name="plus" /> Add filter
      </Button>
    </div>
  );
};
