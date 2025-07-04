import React from "react";

import { Button } from "$app/components/Button";
import { DateInput } from "$app/components/DateInput";
import { Icon } from "$app/components/Icons";
import { Popover } from "$app/components/Popover";

export type FilterType = "date" | "product" | "payment" | "location" | "email_engagement";

interface FilterValue {
  // Date filters
  date?: string;
  start_date?: string;
  end_date?: string;

  // Product filters
  product_ids?: string[];

  // Payment filters
  amount?: string;
  min_amount?: string;
  max_amount?: string;

  // Location filters
  location?: string;
  country?: string;

  // Email engagement filters
  days?: string;
  engagement_type?: "opened" | "clicked" | "not_opened" | "not_clicked";
}

export interface FilterConfig {
  filter_type: FilterType;
  operator:
    | "joining"
    | "affiliation"
    | "following"
    | "purchase"
    | "has_opened_in_last"
    | "has_not_opened_in_last"
    | "is_affiliated_to"
    | "is_member_of"
    | "has_bought"
    | "has_not_yet_bought"
    | "is_equal_to"
    | "is_less_than"
    | "is_more_than"
    | "is"
    | "is_not";
  third_operator?: "is_after" | "is_before" | "is_in_last" | "all" | "any" | undefined;
  value: FilterValue;
  connector?: "and" | "or" | null;
}

interface FilterRowProps {
  filter: FilterConfig;
  onUpdate: (filter: FilterConfig) => void;
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

const getCountryOptions = () => [
  { id: "US", label: "United States" },
  { id: "CA", label: "Canada" },
  { id: "GB", label: "United Kingdom" },
  { id: "AU", label: "Australia" },
  { id: "DE", label: "Germany" },
  { id: "FR", label: "France" },
  { id: "IT", label: "Italy" },
  { id: "ES", label: "Spain" },
  { id: "NL", label: "Netherlands" },
  { id: "BE", label: "Belgium" },
  { id: "CH", label: "Switzerland" },
  { id: "AT", label: "Austria" },
  { id: "SE", label: "Sweden" },
  { id: "NO", label: "Norway" },
  { id: "DK", label: "Denmark" },
  { id: "FI", label: "Finland" },
  { id: "IE", label: "Ireland" },
  { id: "PT", label: "Portugal" },
  { id: "PL", label: "Poland" },
  { id: "CZ", label: "Czech Republic" },
  { id: "HU", label: "Hungary" },
  { id: "GR", label: "Greece" },
  { id: "RO", label: "Romania" },
  { id: "BG", label: "Bulgaria" },
  { id: "HR", label: "Croatia" },
  { id: "SI", label: "Slovenia" },
  { id: "SK", label: "Slovakia" },
  { id: "LT", label: "Lithuania" },
  { id: "LV", label: "Latvia" },
  { id: "EE", label: "Estonia" },
  { id: "LU", label: "Luxembourg" },
  { id: "MT", label: "Malta" },
  { id: "CY", label: "Cyprus" },
  { id: "JP", label: "Japan" },
  { id: "KR", label: "South Korea" },
  { id: "CN", label: "China" },
  { id: "IN", label: "India" },
  { id: "SG", label: "Singapore" },
  { id: "HK", label: "Hong Kong" },
  { id: "TW", label: "Taiwan" },
  { id: "TH", label: "Thailand" },
  { id: "MY", label: "Malaysia" },
  { id: "ID", label: "Indonesia" },
  { id: "PH", label: "Philippines" },
  { id: "VN", label: "Vietnam" },
  { id: "BR", label: "Brazil" },
  { id: "MX", label: "Mexico" },
  { id: "AR", label: "Argentina" },
  { id: "CL", label: "Chile" },
  { id: "CO", label: "Colombia" },
  { id: "PE", label: "Peru" },
  { id: "VE", label: "Venezuela" },
  { id: "UY", label: "Uruguay" },
  { id: "PY", label: "Paraguay" },
  { id: "BO", label: "Bolivia" },
  { id: "EC", label: "Ecuador" },
  { id: "ZA", label: "South Africa" },
  { id: "EG", label: "Egypt" },
  { id: "MA", label: "Morocco" },
  { id: "TN", label: "Tunisia" },
  { id: "DZ", label: "Algeria" },
  { id: "KE", label: "Kenya" },
  { id: "NG", label: "Nigeria" },
  { id: "GH", label: "Ghana" },
  { id: "IL", label: "Israel" },
  { id: "TR", label: "Turkey" },
  { id: "SA", label: "Saudi Arabia" },
  { id: "AE", label: "United Arab Emirates" },
  { id: "QA", label: "Qatar" },
  { id: "KW", label: "Kuwait" },
  { id: "BH", label: "Bahrain" },
  { id: "OM", label: "Oman" },
  { id: "JO", label: "Jordan" },
  { id: "LB", label: "Lebanon" },
  { id: "RU", label: "Russia" },
  { id: "UA", label: "Ukraine" },
  { id: "BY", label: "Belarus" },
  { id: "MD", label: "Moldova" },
  { id: "GE", label: "Georgia" },
  { id: "AM", label: "Armenia" },
  { id: "AZ", label: "Azerbaijan" },
  { id: "KZ", label: "Kazakhstan" },
  { id: "UZ", label: "Uzbekistan" },
  { id: "KG", label: "Kyrgyzstan" },
  { id: "TJ", label: "Tajikistan" },
  { id: "TM", label: "Turkmenistan" },
  { id: "MN", label: "Mongolia" },
  { id: "NZ", label: "New Zealand" },
  { id: "FJ", label: "Fiji" },
  { id: "PG", label: "Papua New Guinea" },
  { id: "NC", label: "New Caledonia" },
  { id: "VU", label: "Vanuatu" },
  { id: "SB", label: "Solomon Islands" },
  { id: "TO", label: "Tonga" },
  { id: "WS", label: "Samoa" },
  { id: "KI", label: "Kiribati" },
  { id: "TV", label: "Tuvalu" },
  { id: "NR", label: "Nauru" },
  { id: "PW", label: "Palau" },
  { id: "FM", label: "Micronesia" },
  { id: "MH", label: "Marshall Islands" },
];

const getValueInput = (filter: FilterConfig, onUpdate: (filter: FilterConfig) => void) => {
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
            onChange={(value) =>
              onUpdate({
                ...filter,
                third_operator: value as "is_after" | "is_before" | "is_in_last",
              })
            }
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
              <span style={{ fontSize: "14px", color: "var(--color-text)" }}>days</span>
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
          <span style={{ fontSize: "14px", color: "var(--color-text)" }}>days</span>
        </div>
      );

    case "product":
      // For product filters, show third dropdown then product input
      return (
        <div style={{ display: "flex", gap: "var(--spacer-2)", alignItems: "center" }}>
          <CustomDropdown
            value={filter.third_operator || "all"}
            onChange={(value) =>
              onUpdate({
                ...filter,
                third_operator: value as "all" | "any",
              })
            }
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
          if (FILTER_TYPE_OPTIONS.some((opt) => opt.id === filterType)) {
            const typedFilterType = filterType as FilterType;
            const firstOperator = getOperatorOptions(typedFilterType)[0];
            const defaultThirdOperator =
              typedFilterType === "date" ? "is_after" : typedFilterType === "product" ? "all" : undefined;
            onUpdate({
              ...filter,
              filter_type: typedFilterType,
              operator: (firstOperator?.id as FilterConfig["operator"]) || "is",
              third_operator: defaultThirdOperator,
              value: {},
            });
          }
        }}
        options={FILTER_TYPE_OPTIONS}
      />

      <CustomDropdown
        value={filter.operator}
        onChange={(operator) => onUpdate({ ...filter, operator: operator as FilterConfig["operator"] })}
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
