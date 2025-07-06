import React from "react";

import { Icon } from "$app/components/Icons";
import { Popover } from "$app/components/Popover";

export interface AudienceDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const AudienceDropdown: React.FC<AudienceDropdownProps> = ({ value, onChange, disabled }) => {
  const options = [
    { id: "customer", label: "Customers" },
    { id: "everyone", label: "Everyone" },
    { id: "follower", label: "Followers" },
    { id: "affiliate", label: "Affiliates" },
  ];

  const segments = [
    { id: "active_subscribers", label: "Active subscribers" },
    { id: "casual_subscribers", label: "Casual subscribers" },
    { id: "cold_subscribers", label: "Cold subscribers" },
  ];

  const selectedOption = [...options, ...segments].find((opt) => opt.id === value);

  return (
    <Popover
      trigger={
        <div
          style={{
            width: "100%",
            height: "48px",
            border: "1px solid #000",
            borderRadius: "4px",
            padding: "12px 16px",
            backgroundColor: disabled ? "var(--color-surface-disabled)" : "var(--color-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: 400,
            boxSizing: "border-box",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {selectedOption?.label ?? "Select"} <Icon name="outline-cheveron-down" />
        </div>
      }
      disabled={disabled ?? false}
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
          <li
            role="separator"
            style={{
              borderTop: "1px solid #e5e5e5",
              margin: "8px 0",
              padding: "8px 16px 4px",
              fontSize: "12px",
              fontWeight: "600",
              color: "#666",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            SEGMENTS
          </li>
          {segments.map((segment) => (
            <li
              key={segment.id}
              role="menuitemradio"
              aria-checked={segment.id === value}
              onClick={() => {
                onChange(segment.id);
                close();
              }}
            >
              <span>{segment.label}</span>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
};
