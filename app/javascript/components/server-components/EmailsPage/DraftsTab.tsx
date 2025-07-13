import { formatDistanceToNow } from "date-fns";
import React from "react";
import { useLoaderData } from "react-router-dom";
import { cast } from "ts-safe-cast";

import {
  deleteInstallment,
  DraftInstallment,
  getAudienceCount,
  getDraftInstallments,
  Pagination,
} from "$app/data/installments";
import { assertDefined } from "$app/utils/assert";
import { asyncVoid } from "$app/utils/promise";
import { AbortError, assertResponseError } from "$app/utils/request";

import { Button, NavigationButton } from "$app/components/Button";
import { useCurrentSeller } from "$app/components/CurrentSeller";
import { Icon } from "$app/components/Icons";
import { Modal } from "$app/components/Modal";
import { Popover } from "$app/components/Popover";
import { showAlert } from "$app/components/server-components/Alert";
import {
  AudienceCounts,
  audienceCountValue,
  EditEmailButton,
  EmptyStatePlaceholder,
  Layout,
  NewEmailButton,
  useSearchContext,
  ViewEmailButton,
} from "$app/components/server-components/EmailsPage";
import { useDebouncedCallback } from "$app/components/useDebouncedCallback";
import { useOnChange } from "$app/components/useOnChange";
import { useUserAgentInfo } from "$app/components/UserAgent";

import draftsPlaceholder from "$assets/images/placeholders/draft_posts.png";

const FILTER_TYPE_OPTIONS = [
  { id: "all", label: "All Types" },
  { id: "audience", label: "Emails" },
  { id: "follower", label: "Followers" },
  { id: "seller", label: "Customers" },
  { id: "product", label: "Product customers" },
  { id: "variant", label: "Variant customers" },
  { id: "affiliate", label: "Affiliates" },
];

// ----------------------------
// Reusable dropdown helpers
// ----------------------------

const DropdownTrigger: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      minWidth: "160px",
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
    }}
  >
    {label} <Icon name="outline-cheveron-down" />
  </div>
);

const CustomDropdown: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: { id: string; label: string }[];
}> = ({ value, onChange, options }) => {
  const selectedOption = options.find((opt) => opt.id === value);
  return (
    <Popover trigger={<DropdownTrigger label={selectedOption?.label ?? "Select"} />}>
      {(close) => (
        <ul role="menu">
          {options.map((option) => (
            <li
              key={option.id}
              role="menuitemradio"
              aria-checked={option.id === value}
              style={{ cursor: "pointer", padding: "6px 12px" }}
              onClick={() => {
                onChange(option.id);
                close();
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
};

const TagDropdown: React.FC<{
  selected: string[];
  onChange: (tags: string[]) => void;
  options: { id: string; label: string }[];
}> = ({ selected, onChange, options }) => {
  const label =
    selected.length === 0
      ? "All tags"
      : selected.length === 1
        ? options.find((o) => o.id === selected[0])?.label || selected[0]
        : `${selected.length} tags`;

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id]);
  };

  return (
    <Popover trigger={<DropdownTrigger label={label ?? "Select"} />}>
      {
        (/* close */) => (
          <ul role="menu" style={{ maxHeight: "220px", overflowY: "auto" }}>
            {options.map((opt) => {
              const checked = selected.includes(opt.id);
              return (
                <li
                  key={opt.id}
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  style={{ cursor: "pointer", padding: "6px 12px" }}
                  onClick={() => toggle(opt.id)}
                >
                  {checked ? "✓ " : ""}
                  {opt.label}
                </li>
              );
            })}
            {options.length === 0 && <li style={{ padding: "6px 12px", color: "#666" }}>No tags available</li>}
          </ul>
        )
      }
    </Popover>
  );
};
// ----------------------------
// DraftsTab component starts
// ----------------------------
export const DraftsTab = () => {
  const data = cast<{ installments: DraftInstallment[]; pagination: Pagination } | undefined>(useLoaderData());
  const [installments, setInstallments] = React.useState(data?.installments ?? []);
  const [pagination, setPagination] = React.useState(data?.pagination ?? { count: 0, next: null });
  const currentSeller = assertDefined(useCurrentSeller(), "currentSeller is required");
  const [audienceCounts, setAudienceCounts] = React.useState<AudienceCounts>(new Map());

  // Filter state
  const [showFilterDropdown, setShowFilterDropdown] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState("all");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  // Extract unique tags from installments for filter options
  const availableTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    installments.forEach((installment) => {
      if (installment.internal_tag) {
        tagSet.add(installment.internal_tag);
      }
    });
    return Array.from(tagSet).map((tag) => ({ id: tag, label: tag }));
  }, [installments]);

  // Filter installments client-side based on selected filters
  const filteredInstallments = React.useMemo(
    () =>
      installments.filter((installment) => {
        // Type filter
        if (selectedType !== "all") {
          const installmentType = installment.installment_type || "audience";
          if (installmentType !== selectedType) {
            return false;
          }
        }

        // Tag filter
        if (selectedTags.length > 0) {
          if (!installment.internal_tag || !selectedTags.includes(installment.internal_tag)) {
            return false;
          }
        }

        return true;
      }),
    [installments, selectedType, selectedTags],
  );

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedTags([]);
    setShowFilterDropdown(false);
  };

  const hasActiveFilters = selectedType !== "all" || selectedTags.length > 0;

  // Filter component for header
  const filterComponent =
    installments.length > 0 ? (
      <Popover
        open={showFilterDropdown}
        onToggle={setShowFilterDropdown}
        aria-label="Toggle Filters"
        position="bottom"
        trigger={
          <div className="button" style={{ position: "relative" }}>
            <Icon name="filter" />
            {hasActiveFilters ? (
              <div
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-2px",
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#0066cc",
                  borderRadius: "50%",
                }}
              />
            ) : null}
          </div>
        }
      >
        <div
          style={{
            width: "200px",
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Type Filter */}
          <div>
            <label
              style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#333" }}
            >
              Type
            </label>
            <CustomDropdown value={selectedType} onChange={setSelectedType} options={FILTER_TYPE_OPTIONS} />
          </div>

          {/* Tag Filter */}
          <div>
            <label
              style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#333" }}
            >
              Tag
            </label>
            <TagDropdown selected={selectedTags} onChange={setSelectedTags} options={availableTags} />
          </div>
        </div>
      </Popover>
    ) : null;

  React.useEffect(() => {
    installments.forEach(
      asyncVoid(async ({ external_id }) => {
        if (audienceCounts.has(external_id)) return;
        setAudienceCounts((prev) => new Map(prev).set(external_id, "loading"));
        try {
          const { count } = await getAudienceCount(external_id);
          setAudienceCounts((prev) => new Map(prev).set(external_id, count));
        } catch (e) {
          assertResponseError(e);
          setAudienceCounts((prev) => new Map(prev).set(external_id, "failed"));
        }
      }),
    );
  }, [installments]);
  const [selectedInstallmentId, setSelectedInstallmentId] = React.useState<string | null>(null);
  const selectedInstallment = selectedInstallmentId
    ? (installments.find((i) => i.external_id === selectedInstallmentId) ?? null)
    : null;
  const [deletingInstallment, setDeletingInstallment] = React.useState<{
    id: string;
    name: string;
    state: "delete-confirmation" | "deleting";
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [query] = useSearchContext();
  const activeFetchRequest = React.useRef<{ cancel: () => void } | null>(null);

  const fetchInstallments = async (reset = false) => {
    const nextPage = reset ? 1 : pagination.next;
    if (!nextPage) return;
    setIsLoading(true);
    try {
      activeFetchRequest.current?.cancel();
      const request = getDraftInstallments({ page: nextPage, query });
      activeFetchRequest.current = request;
      const response = await request.response;
      setInstallments(reset ? response.installments : [...installments, ...response.installments]);
      setPagination(response.pagination);
      activeFetchRequest.current = null;
      setIsLoading(false);
    } catch (e) {
      if (e instanceof AbortError) return;
      activeFetchRequest.current = null;
      setIsLoading(false);
      assertResponseError(e);
      showAlert("Sorry, something went wrong. Please try again.", "error");
    }
  };

  const debouncedFetchInstallments = useDebouncedCallback((reset: boolean) => void fetchInstallments(reset), 500);
  useOnChange(() => debouncedFetchInstallments(true), [query]);

  const handleDelete = async () => {
    if (!deletingInstallment) return;
    try {
      setDeletingInstallment({ ...deletingInstallment, state: "deleting" });
      await deleteInstallment(deletingInstallment.id);
      setInstallments(installments.filter((installment) => installment.external_id !== deletingInstallment.id));
      setDeletingInstallment(null);
      showAlert("Email deleted!", "success");
    } catch (e) {
      assertResponseError(e);
      showAlert("Sorry, something went wrong. Please try again.", "error");
    }
  };

  const userAgentInfo = useUserAgentInfo();

  return (
    <Layout selectedTab="drafts" filterComponent={filterComponent}>
      <div
        style={{
          marginTop: showFilterDropdown ? "20px" : "0",
          transition: "margin-top 0.2s ease-in-out",
        }}
      >
        {/* Active Filter Indicator */}
        {hasActiveFilters ? (
          <div
            style={{
              backgroundColor: "#E3F2FD",
              border: "1px solid #1976D2",
              borderRadius: "4px",
              padding: "12px 16px",
              margin: "16px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "14px",
              color: "#1976D2",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name="info-circle" />
              <span>
                Filtered by type:{" "}
                <strong>{FILTER_TYPE_OPTIONS.find((opt) => opt.id === selectedType)?.label || "All"}</strong>
                {selectedTags.length > 0 && (
                  <span>
                    , tag: <strong>{selectedTags.join(" or ")}</strong>
                  </span>
                )}
              </span>
            </div>
            <Button
              onClick={clearFilters}
              small
              outline
              style={{
                fontSize: "12px",
                padding: "4px 8px",
                height: "auto",
                borderColor: "#1976D2",
                color: "#1976D2",
              }}
            >
              Clear filter
            </Button>
          </div>
        ) : null}

        {filteredInstallments.length === 0 && installments.length > 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p>No drafts found matching your filters.</p>
            {hasActiveFilters ? (
              <Button onClick={clearFilters} outline>
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : filteredInstallments.length > 0 ? (
          <>
            <table
              aria-label="Drafts"
              style={{ marginBottom: "var(--spacer-4)" }}
              aria-live="polite"
              aria-busy={isLoading}
            >
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Sent to</th>
                  <th>Audience</th>
                  <th>Last edited</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstallments.map((installment) => (
                  <tr
                    key={installment.external_id}
                    aria-selected={installment.external_id === selectedInstallmentId}
                    onClick={() => setSelectedInstallmentId(installment.external_id)}
                  >
                    <td data-label="Subject">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--spacer-2)",
                        }}
                      >
                        <div style={{ minWidth: "80px", display: "flex" }}>
                          {installment.internal_tag && (
                            <span
                              style={{
                                backgroundColor: "#ffffff",
                                color: "#000000",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: "500",
                                textTransform: "capitalize",
                                minWidth: "fit-content",
                                whiteSpace: "nowrap",
                                border: "1px solid #333333",
                                display: "inline-block",
                              }}
                            >
                              {installment.internal_tag}
                            </span>
                          )}
                        </div>
                        <span>{installment.name}</span>
                      </div>
                    </td>
                    <td data-label="Sent to">{installment.recipient_description}</td>
                    <td
                      data-label="Audience"
                      aria-busy={audienceCountValue(audienceCounts, installment.external_id) === null}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {audienceCountValue(audienceCounts, installment.external_id)}
                    </td>
                    <td data-label="Last edited" style={{ whiteSpace: "nowrap" }}>
                      {formatDistanceToNow(installment.updated_at)} ago
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination.next ? (
              <Button color="primary" disabled={isLoading} onClick={() => void fetchInstallments()}>
                Load more
              </Button>
            ) : null}
            {selectedInstallment ? (
              <aside>
                <header>
                  <h2>{selectedInstallment.name}</h2>
                  <button className="close" aria-label="Close" onClick={() => setSelectedInstallmentId(null)} />
                </header>
                {selectedInstallment.internal_tag ? (
                  <div>
                    <span
                      style={{
                        backgroundColor: "var(--color-secondary)",
                        color: "var(--color-text-secondary)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        display: "inline-block",
                        marginBottom: "var(--spacer-3)",
                      }}
                    >
                      {selectedInstallment.internal_tag}
                    </span>
                  </div>
                ) : null}
                <div className="stack">
                  <div>
                    <h5>Sent to</h5>
                    {selectedInstallment.recipient_description}
                  </div>
                  <div>
                    <h5>Audience</h5>
                    {audienceCountValue(audienceCounts, selectedInstallment.external_id)}
                  </div>
                  <div>
                    <h5>Last edited</h5>
                    {new Date(selectedInstallment.updated_at).toLocaleString(userAgentInfo.locale, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      timeZone: currentSeller.timeZone.name,
                    })}
                  </div>
                </div>
                <div style={{ display: "grid", gridAutoFlow: "column", gap: "var(--spacer-4)" }}>
                  {selectedInstallment.send_emails ? <ViewEmailButton installment={selectedInstallment} /> : null}
                  {selectedInstallment.shown_on_profile ? (
                    <NavigationButton href={selectedInstallment.full_url} target="_blank" rel="noopener noreferrer">
                      <Icon name="file-earmark-medical-fill" />
                      View post
                    </NavigationButton>
                  ) : null}
                </div>
                <div style={{ display: "grid", gridAutoFlow: "column", gap: "var(--spacer-4)" }}>
                  <NewEmailButton copyFrom={selectedInstallment.external_id} />
                  <EditEmailButton id={selectedInstallment.external_id} />
                  <Button
                    color="danger"
                    onClick={() =>
                      setDeletingInstallment({
                        id: selectedInstallment.external_id,
                        name: selectedInstallment.name,
                        state: "delete-confirmation",
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              </aside>
            ) : null}
            {deletingInstallment ? (
              <Modal
                open
                allowClose={deletingInstallment.state === "delete-confirmation"}
                onClose={() => setDeletingInstallment(null)}
                title="Delete email?"
                footer={
                  <>
                    <Button
                      disabled={deletingInstallment.state === "deleting"}
                      onClick={() => setDeletingInstallment(null)}
                    >
                      Cancel
                    </Button>
                    {deletingInstallment.state === "deleting" ? (
                      <Button color="danger" disabled>
                        Deleting...
                      </Button>
                    ) : (
                      <Button color="danger" onClick={() => void handleDelete()}>
                        Delete email
                      </Button>
                    )}
                  </>
                }
              >
                <h4>
                  Are you sure you want to delete the email "{deletingInstallment.name}"? This action cannot be undone.
                </h4>
              </Modal>
            ) : null}
          </>
        ) : (
          <EmptyStatePlaceholder
            title="Manage your drafts"
            description="Drafts allow you to save your emails and send whenever you're ready!"
            placeholderImage={draftsPlaceholder}
          />
        )}
      </div>
    </Layout>
  );
};
