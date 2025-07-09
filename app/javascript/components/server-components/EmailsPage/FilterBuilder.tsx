import React from "react";

import { Popover } from "$app/components/Popover";

import { FilterGroup, type FilterGroup as FilterGroupType } from "./FilterGroup";

// Custom dropdown component for group connectors
const GroupConnectorDropdown: React.FC<{
  value: "and" | "or";
  onChange: (value: "and" | "or") => void;
}> = ({ value, onChange }) => {
  const options = [
    { id: "and", label: "And" },
    { id: "or", label: "Or" },
  ];

  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <Popover
      trigger={
        <div
          style={{
            width: "80px",
            height: "32px",
            border: "1px solid #000",
            borderRadius: "16px",
            padding: "4px 12px",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--color-text-secondary)",
            backgroundColor: "var(--color-surface)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            userSelect: "none",
          }}
        >
          {selectedOption?.label || "Or"}
        </div>
      }
    >
      {(close) => (
        <div role="menu" style={{ minWidth: "80px" }}>
          {options.map((option) => (
            <div
              key={option.id}
              role="menuitem"
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor: value === option.id ? "var(--color-accent-background)" : "transparent",
                fontSize: "12px",
                fontWeight: 600,
              }}
              onClick={() => {
                const validLogic = option.id === "and" || option.id === "or";
                if (validLogic) {
                  onChange(option.id);
                }
                close();
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </Popover>
  );
};

interface FilterBuilderProps {
  filterGroups: FilterGroupType[];
  onChange: (filterGroups: FilterGroupType[]) => void;
}

export const FilterBuilder: React.FC<FilterBuilderProps> = ({ filterGroups, onChange }) => {
  const updateFilterGroup = (index: number, group: FilterGroupType) => {
    const newGroups = [...filterGroups];
    newGroups[index] = group;
    onChange(newGroups);
  };

  const removeFilterGroup = (index: number) => {
    onChange(filterGroups.filter((_, i) => i !== index));
  };

  // Add connector state for each group (except the first one)
  const [groupConnectors, setGroupConnectors] = React.useState<("and" | "or")[]>(filterGroups.slice(1).map(() => "or"));

  // Update connectors when filterGroups change
  React.useEffect(() => {
    if (filterGroups.length > 1) {
      setGroupConnectors((prev) => {
        const newConnectors = [...prev];
        // Add "or" for new groups
        while (newConnectors.length < filterGroups.length - 1) {
          newConnectors.push("or");
        }
        // Remove connectors for removed groups
        while (newConnectors.length > filterGroups.length - 1) {
          newConnectors.pop();
        }
        return newConnectors;
      });
    }
  }, [filterGroups.length]);

  const updateGroupConnector = (index: number, connector: "and" | "or") => {
    const newConnectors = [...groupConnectors];
    newConnectors[index] = connector;
    setGroupConnectors(newConnectors);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", width: "100%" }}>
      {filterGroups.map((group, index) => (
        <div key={group.id} style={{ position: "relative" }}>
          {index > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "0",
                  right: "0",
                  height: "1px",
                  backgroundColor: "var(--color-border)",
                  zIndex: 0,
                }}
              />
              <div style={{ zIndex: 1, position: "relative" }}>
                <GroupConnectorDropdown
                  value={groupConnectors[index - 1] || "or"}
                  onChange={(value) => updateGroupConnector(index - 1, value)}
                />
              </div>
            </div>
          )}
          <FilterGroup
            group={group}
            onUpdate={(updatedGroup) => updateFilterGroup(index, updatedGroup)}
            onRemove={() => removeFilterGroup(index)}
            canRemove={filterGroups.length > 1}
          />
        </div>
      ))}
    </div>
  );
};
