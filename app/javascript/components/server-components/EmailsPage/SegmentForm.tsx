import cx from "classnames";
import React from "react";
import { useNavigate } from "react-router-dom";

import { useFilterWidth } from "$app/components/FilterBuilder";

import {
  createSegment,
  generateWithAI,
  previewSegment,
  updateSegment,
  type FilterConfig as APIFilterConfig,
  type AudienceMemberFilterGroup,
  type Segment,
} from "$app/data/segments";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { LoadingSpinner } from "$app/components/LoadingSpinner";
import { Popover } from "$app/components/Popover";
import { showAlert } from "$app/components/server-components/Alert";
import { emailTabPath } from "$app/components/server-components/EmailsPage";

import { AIGenerationModal } from "./AIGenerationModal";
import { FilterBuilder } from "./FilterBuilder";
import { type FilterGroup } from "./FilterGroup";
import { type FilterType, type FilterConfig as UIFilterConfig } from "./FilterRow";

// Custom dropdown component for audience selection
const AudienceDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const options = [
    { id: "customer", label: "Customers" },
    { id: "subscriber", label: "Subscribers" },
    { id: "affiliate", label: "Affiliates" },
    { id: "everyone", label: "Everyone" },
  ];

  const selectedOption = options.find((opt) => opt.id === value);

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
            backgroundColor: "var(--color-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 400,
            boxSizing: "border-box",
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

// Helper functions to convert between UI and API filter formats
const convertUIFilterToAPI = (uiFilter: UIFilterConfig): { filter_type: FilterType; config: APIFilterConfig } => {
  const { amount, min_amount, max_amount, days, ...otherValues } = uiFilter.value;

  // Map UI operators to API operators
  const operatorMap: Record<string, string> = {
    is_more_than: "is_more_than",
    is_less_than: "is_less_than",
    is_equal_to: "is",
    is_not: "is_not",
    has_bought: "has_bought",
    has_not_yet_bought: "has_not_bought",
    joining: "is_after",
    affiliation: "is_after",
    following: "is_after",
    purchase: "is_after",
    has_opened_in_last: "in_last",
    has_not_opened_in_last: "not_in_last",
    is_affiliated_to: "is",
    is_member_of: "is",
  };

  const apiOperator = operatorMap[uiFilter.operator] || uiFilter.operator || "is";

  const config: APIFilterConfig = {
    ...otherValues,
    // Convert string amounts to numbers for API
    ...(amount && { amount: parseFloat(amount) }),
    ...(min_amount && { min_amount_cents: Math.round(parseFloat(min_amount) * 100) }),
    ...(max_amount && { max_amount_cents: Math.round(parseFloat(max_amount) * 100) }),
    // Convert days to number for email engagement filters
    ...(days && { days: parseInt(days, 10) }),
  };

  // Add operator only if it's defined and not undefined
  if (apiOperator && apiOperator !== "undefined") {
    (config as any).operator = apiOperator;
  }

  return {
    filter_type: uiFilter.filter_type,
    config,
  };
};

const convertAPIFilterToUI = (
  apiFilter: { filter_type: FilterType; config: APIFilterConfig },
  filterIndex: number,
): UIFilterConfig => {
  const { operator, amount, amount_cents, min_amount_cents, max_amount_cents, days, ...rest } = apiFilter.config;

  // Map API operators back to UI operators
  const reverseOperatorMap: Record<string, string> = {
    is_more_than: "is_more_than",
    is_less_than: "is_less_than",
    is: "is_equal_to",
    is_not: "is_not",
    has_bought: "has_bought",
    has_not_bought: "has_not_yet_bought",
    is_after: "joining",
    in_last: "has_opened_in_last",
    not_in_last: "has_not_opened_in_last",
  };

  const uiOperator = reverseOperatorMap[operator || "is"] || operator || "is_equal_to";

  return {
    filter_type: apiFilter.filter_type,
    operator: uiOperator as UIFilterConfig["operator"],
    value: {
      ...rest,
      // Convert number amounts to strings for UI
      ...(amount && { amount: amount.toString() }),
      ...(amount_cents && { amount: (amount_cents / 100).toString() }),
      ...(min_amount_cents && { min_amount: (min_amount_cents / 100).toString() }),
      ...(max_amount_cents && { max_amount: (max_amount_cents / 100).toString() }),
      // Convert days to string for UI
      ...(days && { days: days.toString() }),
    },
    connector: filterIndex === 0 ? null : "and",
  };
};

const FilterContainer: React.FC<{
  filterGroups: FilterGroup[];
  onChangeFilterGroups: (groups: FilterGroup[]) => void;
  hasError?: boolean;
  showEmptyState?: boolean;
  isAISuggestionMode?: boolean;
}> = ({ filterGroups, onChangeFilterGroups, hasError, isAISuggestionMode }) => {
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacer-3)" }}>
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

      {/* Add filter group button outside but with same alignment */}
      {filterGroups.length > 0 && (
        <Button onClick={addFilterGroup} color="accent" style={{ width: "96%" }}>
          <Icon name="plus" />
          Add filter group
        </Button>
      )}
    </div>
  );
};

interface SegmentFormProps {
  segment?: Segment;
  onSave?: (segment: Segment) => void;
}

interface FormData {
  name: string;
  audience_type: "customer" | "subscriber" | "affiliate" | "everyone";
  filterGroups: FilterGroup[];
}

export const SegmentForm: React.FC<SegmentFormProps> = ({ segment }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState<FormData>({
    name: segment?.name || "",
    audience_type: segment?.audience_type || "customer",
    filterGroups:
      // Convert existing filter groups coming from the API to the UI format
      segment?.audience_member_filter_groups?.map(
        (group: AudienceMemberFilterGroup, index): FilterGroup => ({
          id: `group-${group.id ?? index}`,
          filters:
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            group.audience_member_filters.map(
              (filter, filterIndex): UIFilterConfig => convertAPIFilterToUI(filter, filterIndex),
            ) || [],
        }),
      ) || [],
  });
  const [recipientCount, setRecipientCount] = React.useState<{ count: number | null; loading: boolean }>({
    count: null,
    loading: false,
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [aiSuggestion, setAiSuggestion] = React.useState<{
    filterGroups: FilterGroup[];
    suggestedName?: string;
    audienceType?: FormData["audience_type"];
  } | null>(null);

  const uid = React.useId();

  // Use shared filter width logic
  const filterGroupsToCheck = aiSuggestion ? aiSuggestion.filterGroups : formData.filterGroups;
  const { formMinWidth: formMaxWidth } = useFilterWidth(filterGroupsToCheck);

  // Fetch recipient count whenever filters change
  React.useEffect(() => {
    const fetchCount = async () => {
      setRecipientCount((prev) => ({ ...prev, loading: true }));

      const currentFilterGroups = aiSuggestion ? aiSuggestion.filterGroups : formData.filterGroups;
      const currentAudienceType = aiSuggestion
        ? aiSuggestion.audienceType || formData.audience_type
        : formData.audience_type;

      const payload = {
        segment: {
          name: formData.name || "Untitled",
          audience_type: currentAudienceType,
        },
        filter_groups: currentFilterGroups.map((group) => ({
          name: group.id,
          filters: group.filters.map((filter) => convertUIFilterToAPI(filter)),
        })),
      } as const;

      try {
        const { audience_count } = await previewSegment(payload);
        setRecipientCount({ count: audience_count, loading: false });
      } catch {
        setRecipientCount({ count: null, loading: false });
      }
    };

    void fetchCount();
  }, [JSON.stringify(formData.filterGroups), formData.name, JSON.stringify(aiSuggestion)]);

  const handleAIGenerate = async (prompt: string): Promise<void> => {
    setIsGenerating(true);
    try {
      const result = await generateWithAI(prompt);
      if (result.success && result.filter_groups) {
        // Transform AI generated groups into the UI-friendly structure
        const groups: FilterGroup[] = result.filter_groups.map((group, idx) => ({
          id: group.name ?? `ai-group-${idx}`,
          filters: (group.filters ?? []).map(
            (filter, filterIndex): UIFilterConfig => convertAPIFilterToUI(filter, filterIndex),
          ),
        }));

        // Determine audience type based on AI suggestion context
        let suggestedAudienceType: FormData["audience_type"] = formData.audience_type;
        if (prompt.toLowerCase().includes("subscriber")) {
          suggestedAudienceType = "subscriber";
        } else if (
          prompt.toLowerCase().includes("customer") ||
          prompt.toLowerCase().includes("purchase") ||
          prompt.toLowerCase().includes("bought")
        ) {
          suggestedAudienceType = "customer";
        } else if (prompt.toLowerCase().includes("affiliate")) {
          suggestedAudienceType = "affiliate";
        }

        // Store as suggestion instead of applying immediately
        const suggestion: typeof aiSuggestion = {
          filterGroups: groups,
          audienceType: suggestedAudienceType,
        };
        if (result.suggested_name) {
          suggestion.suggestedName = result.suggested_name;
        }
        setAiSuggestion(suggestion);
      } else {
        // Handle case where AI returns success but no filter groups
        showAlert(
          "I couldn't create filters for that request. Try being more specific or use the manual filters below.",
          "error",
        );
      }
    } catch (error: unknown) {
      // The error message from generateWithAI is already user-friendly
      const message =
        error instanceof Error
          ? error.message
          : "AI generation isn't available right now. Please create your segment manually using the filters below.";
      showAlert(message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIGenerateWrapper = (prompt: string): void => {
    void handleAIGenerate(prompt);
  };

  const handleAcceptAI = () => {
    if (aiSuggestion) {
      setFormData((prev) => ({
        ...prev,
        filterGroups: aiSuggestion.filterGroups,
        name: aiSuggestion.suggestedName || prev.name,
        audience_type: aiSuggestion.audienceType || prev.audience_type,
      }));
      setAiSuggestion(null);
      showAlert("AI suggestions applied successfully!", "success");
    }
  };

  const handleRejectAI = () => {
    setAiSuggestion(null);
  };

  const handleCancel = (): void => {
    navigate(emailTabPath("segments"));
  };

  const handleSave = async (): Promise<void> => {
    setIsLoading(true);
    setErrors({});

    try {
      // Validate form data
      const validationErrors: Record<string, string> = {};

      if (!formData.name.trim()) {
        validationErrors.name = "Segment name is required";
      }

      if (formData.filterGroups.length === 0) {
        validationErrors.filters = "At least one filter is required";
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Prepare payload
      const payload = {
        segment: {
          name: formData.name.trim(),
          audience_type: formData.audience_type,
        },
        filter_groups: formData.filterGroups.map((group) => ({
          name: group.id,
          filters: group.filters.map((filter) => convertUIFilterToAPI(filter)),
        })),
      };

      if (segment?.id) {
        // Update existing segment
        await updateSegment(segment.id, payload);
        showAlert("Segment updated successfully!", "success");
      } else {
        // Create new segment
        await createSegment(payload);
        showAlert("Segment created successfully!", "success");
      }

      // Navigate back to segments list
      navigate(emailTabPath("segments"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save segment. Please try again.";
      showAlert(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <header>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <h1>{segment ? "Edit segment" : "New segment"}</h1>
          <div className="actions">
            <Button outline onClick={handleCancel} disabled={isLoading || isGenerating}>
              <Icon name="x" />
              Cancel
            </Button>
            <Button color="accent" onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </header>

      <section>
        <div className="with-sidebar">
          {/* Sidebar with helper text */}
          <div
            style={{
              padding: "var(--spacer-4)",
              maxWidth: "280px",
              minWidth: "240px",
            }}
          >
            <p
              style={{
                margin: 0,
                marginBottom: "var(--spacer-3)",
                lineHeight: 1.5,
                color: "var(--color-text)",
                fontSize: "16px",
                fontWeight: "normal",
              }}
            >
              Create a segment to automatically group your subscribers based on their attributes and actions.
            </p>
            <p
              style={{
                margin: 0,
                marginBottom: "var(--spacer-4)",
                lineHeight: 1.5,
                color: "var(--color-text-secondary)",
              }}
            >
              Once created, you can use it to send targeted emails and improve engagement.
            </p>
            <p style={{ margin: 0 }}>
              <a
                href="#"
                style={{
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  textDecoration: "underline",
                }}
              >
                Learn more
              </a>
            </p>
          </div>

          <div
            style={{
              backgroundColor: "var(--color-surface)",
              border: "2px solid var(--color-border)",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              flex: 1,
              width: formMaxWidth,
              minWidth: "800px",
              transition: "width 0.3s ease",
            }}
          >
            <div
              style={{
                marginBottom: "var(--spacer-4)",
                backgroundColor: aiSuggestion ? "#E9EEFA" : "transparent",
                borderRadius: aiSuggestion ? "8px" : "0",
                padding: aiSuggestion ? "12px" : "0",
                transition: "background-color 0.2s ease",
              }}
            >
              <fieldset className={cx({ danger: errors.name })}>
                <legend>
                  <label htmlFor={`${uid}-name`}>Name</label>
                </legend>
                <input
                  id={`${uid}-name`}
                  type="text"
                  value={aiSuggestion ? aiSuggestion.suggestedName || formData.name : formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder="Enter segment name..."
                  style={{
                    width: "100%",
                    height: "48px",
                    gap: "8px",
                    borderRadius: "4px",
                    border: "1px solid #000",
                    paddingTop: "12px",
                    paddingRight: "16px",
                    paddingBottom: "12px",
                    paddingLeft: "16px",
                    fontSize: "14px",
                    backgroundColor: "var(--color-surface)",
                    boxSizing: "border-box",
                  }}
                />
                {errors.name ? <div className="field-error">{errors.name}</div> : null}
              </fieldset>
            </div>

            <div
              style={{
                marginBottom: "var(--spacer-4)",
                backgroundColor: aiSuggestion ? "#E9EEFA" : "transparent",
                borderRadius: aiSuggestion ? "8px" : "0",
                padding: aiSuggestion ? "12px" : "0",
                transition: "background-color 0.2s ease",
              }}
            >
              <fieldset>
                <legend>
                  <label>Contacts in this segment: {recipientCount.loading ? "..." : recipientCount.count || 0}</label>
                </legend>
                <AudienceDropdown
                  value={aiSuggestion ? aiSuggestion.audienceType || formData.audience_type : formData.audience_type}
                  onChange={(value) => {
                    if (
                      value === "customer" ||
                      value === "subscriber" ||
                      value === "affiliate" ||
                      value === "everyone"
                    ) {
                      setFormData((prev) => ({ ...prev, audience_type: value }));
                    }
                  }}
                />
              </fieldset>
            </div>

            {/* AI Generation button or Accept/Reject buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "var(--spacer-3)",
              }}
            >
              {aiSuggestion ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Button
                    onClick={handleRejectAI}
                    style={{
                      backgroundColor: "#D73502",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M12 4L4 12M4 4L12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Reject
                  </Button>
                  <Button
                    onClick={handleAcceptAI}
                    style={{
                      backgroundColor: "#E879F9",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M13.5 4.5L6 12L2.5 8.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Accept
                  </Button>
                </div>
              ) : (
                <AIGenerationModal onGenerate={handleAIGenerateWrapper} isGenerating={isGenerating} />
              )}
            </div>

            {/* Filter Container */}
            <FilterContainer
              filterGroups={aiSuggestion ? aiSuggestion.filterGroups : formData.filterGroups}
              onChangeFilterGroups={(groups) => {
                setFormData((prev) => ({ ...prev, filterGroups: groups }));
                if (errors.filters) setErrors((prev) => ({ ...prev, filters: "" }));
              }}
              hasError={!!errors.filters}
              isAISuggestionMode={!!aiSuggestion}
            />
            {errors.filters ? (
              <div
                style={{
                  marginTop: "var(--spacer-2)",
                  color: "var(--color-danger)",
                  fontSize: "var(--font-size-small)",
                  textAlign: "center",
                }}
              >
                {errors.filters}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
};
