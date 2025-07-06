import React from "react";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { FilterBuilder } from "$app/components/server-components/EmailsPage/FilterBuilder";
import { type FilterGroup } from "$app/components/server-components/EmailsPage/FilterGroup";

export interface FilterContainerProps {
  filterGroups: FilterGroup[];
  onChangeFilterGroups: (groups: FilterGroup[]) => void;
  hasError?: boolean;
  showEmptyState?: boolean;
  isAISuggestionMode?: boolean;
}

export const FilterContainer: React.FC<FilterContainerProps> = ({
  filterGroups,
  onChangeFilterGroups,
  hasError,
  isAISuggestionMode,
}) => {
  const addFirstFilter = () => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      filters: [
        {
          filter_type: "payment",
          operator: "is_more_than",
          value: { amount: "0" },
          connector: null,
        },
      ],
    };
    onChangeFilterGroups([newGroup]);
  };

  const addFilterGroup = () => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      filters: [
        {
          filter_type: "payment",
          operator: "is_more_than",
          value: { amount: "0" },
          connector: null,
        },
      ],
    };
    onChangeFilterGroups([...filterGroups, newGroup]);
  };

  const isEditMode = filterGroups.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacer-3)", width: "100%" }}>
      <div
        style={{
          border: hasError
            ? "2px dashed var(--color-danger)"
            : isEditMode
              ? "1px solid var(--color-border)"
              : "3px dashed #ccc",
          backgroundColor: isAISuggestionMode ? "#E9EEFA" : isEditMode ? "var(--color-surface)" : "transparent",
          borderRadius: "var(--border-radius)",
          padding: 0,
          minHeight: filterGroups.length === 0 ? "160px" : "auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacer-4)",
          width: "100%",
          overflow: "visible",
        }}
      >
        {filterGroups.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              flex: 1,
              gap: "var(--spacer-3)",
            }}
          >
            <Button
              onClick={addFirstFilter}
              style={{
                width: "auto",
                minWidth: "160px",
              }}
            >
              <Icon name="plus" />
              Add filter
            </Button>
            <p
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "var(--font-size-small)",
                textAlign: "center",
                margin: 0,
              }}
            >
              Customize your email audience and choose exactly who receives your emails.
            </p>
          </div>
        ) : (
          <FilterBuilder filterGroups={filterGroups} onChange={onChangeFilterGroups} />
        )}
      </div>

      {filterGroups.length > 0 && (
        <Button onClick={addFilterGroup} color="accent" style={{ width: "96%" }}>
          <Icon name="plus" />
          Add filter group
        </Button>
      )}
    </div>
  );
};
