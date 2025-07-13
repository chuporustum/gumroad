import React from "react";

import { type FilterType, type UIFilterConfig, type UIFilterValue } from "$app/data/segments";
import { COUNTRY_OPTIONS } from "$app/constants/countries";

import { Button } from "$app/components/Button";
import { DateInput } from "$app/components/DateInput";
import { Icon } from "$app/components/Icons";
import { Popover } from "$app/components/Popover";

// Re-export for backward compatibility
export type { FilterType, UIFilterConfig as FilterConfig, UIFilterValue as FilterValue };

interface FilterRowProps {
  filter: UIFilterConfig;
  onUpdate: (filter: UIFilterConfig) => void;
  onRemove: () => void;
  canRemove: boolean;
  isFirstRow?: boolean;
}

const FILTER_TYPE_OPTIONS = [
  { id: "date" as const, label: "Date" },
  { id: "email_engagement" as const, label: "Email Activity" },
  { id: "product" as const, label: "Product" },
  { id: "payment" as const, label: "Payment" },
  { id: "location" as const, label: "Location" },
];

const getOperatorOptions = (filterType: FilterType) => {
  switch (filterType) {
    case "date":
      return [
        { id: "joining", label: "Joining" },
        { id: "affiliation", label: "Affiliation" },
        { id: "following", label: "Following" },
        { id: "purchase", label: "Purchase" },
      ];
    case "email_engagement":
      return [
        { id: "has_opened_in_last", label: "Has opened in the last" },
        { id: "has_not_opened_in_last", label: "Has not opened in the last" },
      ];
    case "product":
      return [
        { id: "is_affiliated_to", label: "Is affiliated to" },
        { id: "is_member_of", label: "Is member of" },
        { id: "has_bought", label: "Has bought" },
        { id: "has_not_yet_bought", label: "Has not yet bought" },
      ];
    case "payment":
      return [
        { id: "is_equal_to", label: "Is equal to" },
        { id: "is_less_than", label: "Is less than" },
        { id: "is_more_than", label: "Is more than" },
      ];
    case "location":
      return [
        { id: "is", label: "Is" },
        { id: "is_not", label: "Is not" },
      ];
    default:
      return [];
  }
};

const getThirdDropdownOptions = (filterType: FilterType) => {
  switch (filterType) {
    case "date":
      return [
        { id: "is_after", label: "Is after" },
        { id: "is_before", label: "Is before" },
        { id: "is_in_last", label: "Is in the last" },
      ];
    case "product":
      return [
        { id: "all", label: "All" },
        { id: "any", label: "Any" },
      ];
    default:
      return [];
  }
};

const getCountryOptions = () => COUNTRY_OPTIONS;

const getValueInput = (filter: UIFilterConfig, onUpdate: (filter: UIFilterConfig) => void) => {
  const uid = React.useId();

  // Figma-based styling with consistent black borders
  const inputStyle = {
    width: "200px",
    height: "40px",
    border: "1px solid #000",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "14px",
    backgroundColor: "var(--color-surface)",
    boxSizing: "border-box" as const,
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  };

  const dropdownStyle = {
    width: "200px",
    height: "40px",
    border: "1px solid #000",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "14px",
    backgroundColor: "var(--color-surface)",
    boxSizing: "border-box" as const,
    cursor: "pointer",
  };

  switch (filter.filter_type) {
    case "date":
      // For date filters, show third dropdown then date input
      return (
        <div style={{ display: "flex", gap: "var(--spacer-2)", alignItems: "center" }}>
          <CustomDropdown
            value={filter.third_operator || "is_after"}
            onChange={(value) => {
              const validThirdOperator = ["is_after", "is_before", "is_in_last"].includes(value);
              if (validThirdOperator) {
                onUpdate({
                  ...filter,
                  third_operator: value as "is_after" | "is_before" | "is_in_last",
                });
              }
            }}
            options={getThirdDropdownOptions(filter.filter_type)}
            style={dropdownStyle}
          />
          {filter.third_operator === "is_in_last" ? (
            <div style={{ display: "flex", gap: "var(--spacer-2)", alignItems: "center" }}>
              <input
                id={uid}
                type="number"
                min="1"
                style={{
                  width: "80px",
                  height: "40px",
                  border: "1px solid #000",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  fontSize: "14px",
                  backgroundColor: "var(--color-surface)",
                }}
                value={filter.value.days || ""}
                onChange={(e) => onUpdate({ ...filter, value: { ...filter.value, days: e.target.value } })}
                placeholder="30"
              />
              <span style={{ fontSize: "14px", color: "var(--color-text)", whiteSpace: "nowrap" }}>days</span>
            </div>
          ) : (
            <DateInput
              value={filter.value.date ? new Date(filter.value.date) : null}
              onChange={(date) => onUpdate({ ...filter, value: { date: date?.toISOString().split("T")[0] || "" } })}
              style={{
                border: "1px solid #000",
                borderRadius: "4px",
                height: "40px",
                padding: "8px 12px",
                backgroundColor: "var(--color-surface)",
                width: "150px",
              }}
            />
          )}
        </div>
      );

    case "email_engagement":
      // For email engagement, show number input with "days" suffix
      return (
        <div style={{ display: "flex", gap: "var(--spacer-2)", alignItems: "center" }}>
          <input
            id={uid}
            type="number"
            min="1"
            style={{
              width: "80px",
              height: "40px",
              border: "1px solid #000",
              borderRadius: "4px",
              padding: "8px 12px",
              fontSize: "14px",
              backgroundColor: "var(--color-surface)",
            }}
            value={filter.value.days || ""}
            onChange={(e) => onUpdate({ ...filter, value: { ...filter.value, days: e.target.value } })}
            placeholder="30"
          />
          <span style={{ fontSize: "14px", color: "var(--color-text)", whiteSpace: "nowrap" }}>days</span>
        </div>
      );

    case "product":
      // For product filters, show third dropdown then product input
      return (
        <div style={{ display: "flex", gap: "var(--spacer-2)", alignItems: "center" }}>
          <CustomDropdown
            value={filter.third_operator || "all"}
            onChange={(value) => {
              const validThirdOperator = ["all", "any"].includes(value);
              if (validThirdOperator) {
                onUpdate({
                  ...filter,
                  third_operator: value as "all" | "any",
                });
              }
            }}
            options={getThirdDropdownOptions(filter.filter_type)}
            style={dropdownStyle}
          />
          <input
            id={uid}
            type="text"
            style={inputStyle}
            placeholder="Enter product IDs (comma-separated)"
            value={Array.isArray(filter.value.product_ids) ? filter.value.product_ids.join(", ") : ""}
            onChange={(e) =>
              onUpdate({
                ...filter,
                value: {
                  product_ids: e.target.value
                    .split(",")
                    .map((id) => id.trim())
                    .filter(Boolean),
                },
              })
            }
          />
        </div>
      );

    case "payment":
      // For payment filters, show currency input
      return (
        <div style={{ position: "relative", display: "inline-block" }}>
          <span
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "14px",
              color: "var(--color-text)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            $
          </span>
          <input
            id={uid}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            style={{
              ...inputStyle,
              paddingLeft: "24px",
            }}
            value={filter.value.amount || ""}
            onChange={(e) => onUpdate({ ...filter, value: { amount: e.target.value } })}
          />
        </div>
      );

    case "location":
      // For location filters, show country dropdown
      return (
        <CustomDropdown
          value={filter.value.country || "US"}
          onChange={(value) =>
            onUpdate({
              ...filter,
              value: { ...filter.value, country: value },
            })
          }
          options={getCountryOptions()}
          style={dropdownStyle}
        />
      );

    default:
      return null;
  }
};

const CustomDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  style?: React.CSSProperties;
  autoWidth?: boolean;
}> = ({ value, onChange, options, style, autoWidth = false }) => {
  const selectedOption = options.find((opt) => opt.id === value);

  // Calculate width based on content if autoWidth is true
  const dynamicWidth = autoWidth ? `${Math.max(120, (selectedOption?.label.length || 0) * 8 + 40)}px` : "160px";

  return (
    <Popover
      trigger={
        <div
          style={{
            width: dynamicWidth,
            height: "40px",
            border: "1px solid #000",
            borderRadius: "6px",
            padding: "8px 12px",
            backgroundColor: "var(--color-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
            boxSizing: "border-box",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            ...style,
          }}
        >
          {selectedOption?.label ?? "Select"} <Icon name="outline-cheveron-down" />
        </div>
      }
    >
      {(close) => (
        <ul role="menu">
          {options.map((option) => (
            <li
              key={option.id}
              role="menuitemradio"
              aria-checked={option.id === value}
              onClick={() => {
                onChange(option.id);
                close();
              }}
            >
              <span>{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
};

const ConnectorDropdown: React.FC<{
  value: "and" | "or";
  onChange: (value: "and" | "or") => void;
}> = ({ value, onChange }) => (
  <CustomDropdown
    value={value}
    onChange={(val) => {
      if (val === "and" || val === "or") {
        onChange(val);
      }
    }}
    options={[
      { id: "and", label: "And" },
      { id: "or", label: "Or" },
    ]}
    style={{
      width: "70px",
      height: "36px",
      backgroundColor: "var(--color-surface)",
      border: "1px solid #000",
      borderRadius: "20px",
      padding: "8px 12px",
      fontSize: "14px",
      fontWeight: 500,
    }}
  />
);

export const FilterRow: React.FC<FilterRowProps> = ({ filter, onUpdate, onRemove, canRemove, isFirstRow = false }) => {
  const operatorOptions = getOperatorOptions(filter.filter_type);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        backgroundColor: "var(--color-background)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        width: "100%",
        minHeight: "72px",
        boxSizing: "border-box",
        justifyContent: "flex-end",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "80px" }}>
        {isFirstRow ? (
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              marginBottom: "4px",
              textAlign: "center",
            }}
          >
            Where
          </span>
        ) : (
          <ConnectorDropdown
            value={filter.connector || "and"}
            onChange={(connector) => onUpdate({ ...filter, connector })}
          />
        )}
      </div>

      <CustomDropdown
        value={filter.filter_type}
        onChange={(filterType) => {
          const validFilterType = FILTER_TYPE_OPTIONS.find((opt) => opt.id === filterType);
          if (validFilterType) {
            const typedFilterType = validFilterType.id;
            const firstOperator = getOperatorOptions(typedFilterType)[0];
            const defaultThirdOperator =
              typedFilterType === "date" ? "is_after" : typedFilterType === "product" ? "all" : undefined;
            onUpdate({
              ...filter,
              filter_type: typedFilterType,
              operator: (firstOperator?.id || "is") as UIFilterConfig["operator"],
              third_operator: defaultThirdOperator,
              value: {},
            });
          }
        }}
        options={FILTER_TYPE_OPTIONS}
      />

      <CustomDropdown
        value={filter.operator}
        onChange={(operator) => onUpdate({ ...filter, operator: operator as UIFilterConfig["operator"] })}
        options={operatorOptions}
        autoWidth
      />

      <div>{getValueInput(filter, onUpdate)}</div>

      <div style={{ marginLeft: "12px" }}>
        <Button onClick={onRemove} disabled={!canRemove} color="danger" outline small aria-label="Remove filter">
          <Icon name="trash2" />
        </Button>
      </div>
    </div>
  );
};
