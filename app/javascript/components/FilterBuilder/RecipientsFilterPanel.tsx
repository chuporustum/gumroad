import React from "react";

import { Button } from "$app/components/Button";
import { LoadingSpinner } from "$app/components/LoadingSpinner";
import { showAlert } from "$app/components/server-components/Alert";
import { AIGenerationModal } from "$app/components/server-components/EmailsPage/AIGenerationModal";
import { type FilterGroup } from "$app/components/server-components/EmailsPage/FilterGroup";
import { type FilterConfig as UIFilterConfig } from "$app/components/server-components/EmailsPage/FilterRow";
import { generateWithAI, previewSegment } from "$app/data/segments";

import { AudienceDropdown } from "./AudienceDropdown";
import { FilterContainer } from "./FilterContainer";
import { convertAPIFilterToUI, convertUIFilterToAPI } from "./filterConversion";

export interface RecipientsFilterPanelProps {
  audienceType: string;
  onAudienceTypeChange: (type: string) => void;
  onFiltersChange?: (data: { audienceType: string; segmentIds?: string[]; filterGroups?: FilterGroup[] }) => void;
  disabled?: boolean;
}

export const RecipientsFilterPanel: React.FC<RecipientsFilterPanelProps> = ({
  audienceType,
  onAudienceTypeChange,
  onFiltersChange,
  disabled = false,
}) => {
  const [filterGroups, setFilterGroups] = React.useState<FilterGroup[]>([]);
  const [recipientCount, setRecipientCount] = React.useState<{ count: number | null; loading: boolean }>({
    count: null,
    loading: false,
  });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [aiSuggestion, setAiSuggestion] = React.useState<{
    filterGroups: FilterGroup[];
    suggestedName?: string;
    audienceType?: string;
  } | null>(null);

  React.useEffect(() => {
    const fetchCount = async () => {
      setRecipientCount((prev) => ({ ...prev, loading: true }));

      const currentFilterGroups = aiSuggestion ? aiSuggestion.filterGroups : filterGroups;
      const currentAudienceType = aiSuggestion ? aiSuggestion.audienceType || audienceType : audienceType;

      const payload = {
        segment: {
          name: "temp",
          audience_type: currentAudienceType as "affiliate" | "customer" | "everyone" | "subscriber",
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
  }, [JSON.stringify(filterGroups), audienceType, JSON.stringify(aiSuggestion)]);

  React.useEffect(() => {
    if (onFiltersChange) {
      const data: { audienceType: string; segmentIds?: string[]; filterGroups?: FilterGroup[] } = {
        audienceType,
      };

      if (filterGroups.length > 0) {
        data.filterGroups = filterGroups;
      }

      onFiltersChange(data);
    }
  }, [audienceType, filterGroups, onFiltersChange]);

  const handleAIGenerate = async (prompt: string): Promise<void> => {
    setIsGenerating(true);
    try {
      const result = await generateWithAI(prompt);
      if (result.success && result.filter_groups) {
        const groups: FilterGroup[] = result.filter_groups.map((group, idx) => ({
          id: group.name ?? `ai-group-${idx}`,
          filters: (group.filters ?? []).map(
            (filter, filterIndex): UIFilterConfig => convertAPIFilterToUI(filter, filterIndex),
          ),
        }));

        let suggestedAudienceType: string = audienceType;
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

        const suggestion: typeof aiSuggestion = {
          filterGroups: groups,
          audienceType: suggestedAudienceType,
        };

        setAiSuggestion(suggestion);
      } else {
        showAlert(
          "I couldn't create filters for that request. Try being more specific or use the manual filters below.",
          "error",
        );
      }
    } catch (error: unknown) {
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
      setFilterGroups(aiSuggestion.filterGroups);
      if (aiSuggestion.audienceType) {
        onAudienceTypeChange(aiSuggestion.audienceType);
      }
      setAiSuggestion(null);
      showAlert("AI suggestions applied successfully!", "success");
    }
  };

  const handleRejectAI = () => {
    setAiSuggestion(null);
  };

  return (
    <div style={{ display: "grid", gap: "var(--spacer-4)" }}>
      <fieldset>
        <legend style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>
            Recipients:{" "}
            {recipientCount.loading ? <LoadingSpinner width="1em" /> : recipientCount.count?.toLocaleString() || 0}
          </span>
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
                Accept
              </Button>
            </div>
          ) : (
            <AIGenerationModal onGenerate={handleAIGenerateWrapper} isGenerating={isGenerating} />
          )}
        </legend>
        <AudienceDropdown
          value={aiSuggestion ? aiSuggestion.audienceType || audienceType : audienceType}
          onChange={onAudienceTypeChange}
          disabled={disabled}
        />
      </fieldset>

      <FilterContainer
        filterGroups={aiSuggestion ? aiSuggestion.filterGroups : filterGroups}
        onChangeFilterGroups={(groups) => {
          setFilterGroups(groups);
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
  );
};
