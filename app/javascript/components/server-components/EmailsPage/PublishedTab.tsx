import React from "react";
import { useLoaderData } from "react-router-dom";
import { cast } from "ts-safe-cast";

import { deleteInstallment, getPublishedInstallments, Pagination, PublishedInstallment } from "$app/data/installments";
import { assertDefined } from "$app/utils/assert";
import { formatStatNumber } from "$app/utils/formatStatNumber";
import { AbortError, assertResponseError } from "$app/utils/request";

import { Button } from "$app/components/Button";
import { useCurrentSeller } from "$app/components/CurrentSeller";
import { Icon } from "$app/components/Icons";
import { Modal } from "$app/components/Modal";
import { showAlert } from "$app/components/server-components/Alert";
import {
  EditEmailButton,
  EmptyStatePlaceholder,
  Layout,
  NewEmailButton,
  useSearchContext,
} from "$app/components/server-components/EmailsPage";
import { useDebouncedCallback } from "$app/components/useDebouncedCallback";
import { useOnChange } from "$app/components/useOnChange";
import { useUserAgentInfo } from "$app/components/UserAgent";

import publishedPlaceholder from "$assets/images/placeholders/published_posts.png";

export const PublishedTab = () => {
  const data = cast<{ installments: PublishedInstallment[]; pagination: Pagination } | undefined>(useLoaderData());
  const [installments, setInstallments] = React.useState(data?.installments ?? []);
  const [pagination, setPagination] = React.useState(data?.pagination ?? { count: 0, next: null });
  const currentSeller = assertDefined(useCurrentSeller(), "currentSeller is required");
  const uid = React.useId();
  const [selectedInstallmentId, setSelectedInstallmentId] = React.useState<string | null>(null);
  const [deletingInstallment, setDeletingInstallment] = React.useState<{
    id: string;
    name: string;
    state: "delete-confirmation" | "deleting";
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [resendSubject, setResendSubject] = React.useState("");
  const [resendPreheader, setResendPreheader] = React.useState("");
  const [isResending, setIsResending] = React.useState(false);
  const selectedInstallment = selectedInstallmentId
    ? (installments.find((i) => i.external_id === selectedInstallmentId) ?? null)
    : null;

  // Initialize resend form when installment is selected
  React.useEffect(() => {
    if (selectedInstallment) {
      setResendSubject(selectedInstallment.name);
      setResendPreheader(selectedInstallment.preheader || "");
    }
  }, [selectedInstallment]);

  const [query] = useSearchContext();
  const activeFetchRequest = React.useRef<{ cancel: () => void } | null>(null);

  const fetchInstallments = async ({ reset }: { reset: boolean }) => {
    const nextPage = reset ? 1 : pagination.next;
    if (!nextPage) return;
    setIsLoading(true);
    try {
      activeFetchRequest.current?.cancel();
      const request = getPublishedInstallments({ page: nextPage, query });
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
  const debouncedFetchInstallments = useDebouncedCallback(
    (options: { reset: boolean }) => void fetchInstallments(options),
    500,
  );

  useOnChange(() => {
    debouncedFetchInstallments({ reset: true });
  }, [query]);

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
    <Layout selectedTab="published">
      <div style={{ paddingTop: "var(--spacer-6)" }}>
        {installments.length > 0 ? (
          <>
            <table
              aria-label="Published"
              aria-live="polite"
              aria-busy={isLoading}
              style={{ marginBottom: "var(--spacer-4)" }}
            >
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Emailed</th>
                  <th>Opened</th>
                  <th>Clicks</th>
                  <th>
                    Post Views{" "}
                    <div
                      className="has-tooltip top"
                      aria-describedby={`views-tooltip-${uid}`}
                      style={{ whiteSpace: "normal" }}
                    >
                      <Icon name="info-circle" />
                      <div role="tooltip" id={`views-tooltip-${uid}`}>
                        Post Views only apply to emails published on your profile.
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {installments.map((installment) => (
                  <tr
                    key={installment.external_id}
                    aria-selected={installment.external_id === selectedInstallmentId}
                    onClick={() => setSelectedInstallmentId(installment.external_id)}
                  >
                    <td data-label="Subject">
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacer-2)" }}>
                        {installment.internal_tag && (
                          <span
                            style={{
                              backgroundColor: "transparent",
                              color: "#333",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: "500",
                              border: "1px solid #000",
                              display: "inline-block",
                            }}
                          >
                            {installment.internal_tag}
                          </span>
                        )}
                        <span>{installment.name}</span>
                      </div>
                    </td>
                    <td data-label="Date" style={{ whiteSpace: "nowrap" }}>
                      {new Date(installment.published_at).toLocaleDateString(userAgentInfo.locale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: currentSeller.timeZone.name,
                      })}
                    </td>
                    <td data-label="Emailed" style={{ whiteSpace: "nowrap" }}>
                      {installment.send_emails ? formatStatNumber({ value: installment.sent_count }) : "0"}
                    </td>
                    <td data-label="Opened" style={{ whiteSpace: "nowrap" }}>
                      {installment.send_emails ? formatStatNumber({ value: installment.open_count }) : "0"}
                    </td>
                    <td data-label="Clicks" style={{ whiteSpace: "nowrap" }}>
                      {installment.clicked_urls.length > 0 ? (
                        <span className="has-tooltip" aria-describedby={`url-clicks-${installment.external_id}`}>
                          {formatStatNumber({ value: installment.click_count })}
                          <div
                            role="tooltip"
                            id={`url-clicks-${installment.external_id}`}
                            style={{ padding: 0, width: "20rem" }}
                          >
                            <table>
                              <tbody>
                                {installment.clicked_urls.map(({ url, count }) => (
                                  <tr key={`${installment.external_id}-${url}`}>
                                    <th
                                      scope="row"
                                      style={{ whiteSpace: "break-spaces", maxWidth: "calc(20rem * 0.7)" }}
                                    >
                                      {url}
                                    </th>
                                    <td>{formatStatNumber({ value: count })}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </span>
                      ) : (
                        formatStatNumber({ value: installment.click_count })
                      )}
                    </td>
                    <td data-label="Post Views" style={{ whiteSpace: "nowrap" }}>
                      {formatStatNumber({
                        value: installment.view_count,
                        placeholder: "n/a",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination.next ? (
              <Button color="primary" disabled={isLoading} onClick={() => void fetchInstallments({ reset: false })}>
                Load more
              </Button>
            ) : null}
            {selectedInstallment ? (
              <aside>
                <header>
                  <h2>{selectedInstallment.name}</h2>
                  <button className="close" aria-label="Close" onClick={() => setSelectedInstallmentId(null)} />
                </header>
                {selectedInstallment.internal_tag && (
                  <div>
                    <span
                      style={{
                        backgroundColor: "transparent",
                        color: "#333",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        border: "1px solid #000",
                        display: "inline-block",
                        marginBottom: "var(--spacer-3)",
                      }}
                    >
                      {selectedInstallment.internal_tag}
                    </span>
                  </div>
                )}
                <div className="stack">
                  <div>
                    <h5>Sent</h5>
                    {new Date(selectedInstallment.published_at).toLocaleString(userAgentInfo.locale, {
                      timeZone: currentSeller.timeZone.name,
                    })}
                  </div>
                  <div>
                    <h5>Emailed</h5>
                    {selectedInstallment.send_emails
                      ? formatStatNumber({ value: selectedInstallment.sent_count })
                      : "0"}
                  </div>
                  <div>
                    <h5>Opened</h5>
                    {selectedInstallment.send_emails
                      ? selectedInstallment.open_rate !== null
                        ? `${formatStatNumber({ value: selectedInstallment.open_count })} (${formatStatNumber({ value: selectedInstallment.open_rate, suffix: "%" })})`
                        : formatStatNumber({ value: selectedInstallment.open_count })
                      : "0"}
                  </div>
                  <div>
                    <h5>Clicks</h5>
                    {selectedInstallment.send_emails
                      ? selectedInstallment.click_rate !== null
                        ? `${formatStatNumber({ value: selectedInstallment.click_count })} (${formatStatNumber({ value: selectedInstallment.click_rate, suffix: "%" })})`
                        : formatStatNumber({ value: selectedInstallment.click_count })
                      : "0"}
                  </div>
                  <div>
                    <h5>Bounced</h5>
                    {selectedInstallment.send_emails
                      ? formatStatNumber({ value: selectedInstallment.bounce_count || 0 })
                      : "0"}
                  </div>
                  <div>
                    <h5>Unsubscribers</h5>
                    {selectedInstallment.send_emails
                      ? formatStatNumber({ value: selectedInstallment.unsubscribe_count || 0 })
                      : "0"}
                  </div>
                  <div>
                    <h5>Post Views</h5>
                    {formatStatNumber({
                      value: selectedInstallment.view_count,
                      placeholder: "n/a",
                    })}
                  </div>
                </div>

                {/* Resend to unopens section */}
                <div
                  style={{
                    border: "1px solid #000",
                    borderRadius: "4px",
                    padding: "var(--spacer-4)",
                    display: "grid",
                    gap: "var(--spacer-3)",
                    backgroundColor: "white",
                  }}
                >
                  <div
                    style={{
                      borderBottom: "1px solid #ddd",
                      paddingBottom: "var(--spacer-2)",
                      marginBottom: "var(--spacer-1)",
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Resend to unopens</h4>
                  </div>

                  <div>
                    <label
                      style={{ fontSize: "14px", fontWeight: "500", marginBottom: "var(--spacer-1)", display: "block" }}
                    >
                      Subject
                    </label>
                    <input
                      type="text"
                      value={resendSubject}
                      onChange={(e) => setResendSubject(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "1px solid #000",
                        borderRadius: "4px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        backgroundColor: "white",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{ fontSize: "14px", fontWeight: "500", marginBottom: "var(--spacer-1)", display: "block" }}
                    >
                      Preheader
                    </label>
                    <input
                      type="text"
                      value={resendPreheader}
                      onChange={(e) => setResendPreheader(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "1px solid #000",
                        borderRadius: "4px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        backgroundColor: "white",
                      }}
                    />
                  </div>

                  <Button
                    color="primary"
                    style={{
                      backgroundColor: "#000",
                      color: "white",
                      width: "100%",
                      justifyContent: "center",
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: "500",
                      borderRadius: "4px",
                      border: "none",
                      boxSizing: "border-box",
                    }}
                    disabled={isResending || !resendSubject.trim()}
                    onClick={async () => {
                      if (!selectedInstallment || !resendSubject.trim()) return;

                      setIsResending(true);
                      try {
                        // TODO: Implement API call to resend email to unopens
                        // Example of what the API call would look like:
                        // await resendToUnopens(selectedInstallment.external_id, {
                        //   subject: resendSubject,
                        //   preheader: resendPreheader,
                        //   message: selectedInstallment.message
                        // });

                        showAlert("Email resent to recipients who haven't opened!", "success");
                      } catch (e) {
                        assertResponseError(e);
                        showAlert("Failed to resend email. Please try again.", "error");
                      } finally {
                        setIsResending(false);
                      }
                    }}
                  >
                    {isResending ? "Resending..." : "Resend email"}
                  </Button>
                </div>

                {/* Action buttons */}
                <div style={{ display: "grid", gap: "var(--spacer-3)" }}>
                  <Button
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "12px",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacer-2)",
                      border: "1px solid #000",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      color: "#000",
                      boxSizing: "border-box",
                    }}
                  >
                    <Icon name="people-fill" />
                    View Recipients
                  </Button>

                  <Button
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "12px",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacer-2)",
                      border: "1px solid #000",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      color: "#000",
                      boxSizing: "border-box",
                    }}
                  >
                    <Icon name="envelope-fill" />
                    View Email
                  </Button>

                  <Button
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "12px",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacer-2)",
                      border: "1px solid #000",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      color: "#000",
                      boxSizing: "border-box",
                    }}
                  >
                    <Icon name="file-earmark-text-fill" />
                    View Post
                  </Button>
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
                  Are you sure you want to delete the email "{deletingInstallment.name}"? Customers who had access will
                  no longer be able to see it. This action cannot be undone.
                </h4>
              </Modal>
            ) : null}
          </>
        ) : (
          <EmptyStatePlaceholder
            title="Connect with your customers."
            description="Post new updates, send email broadcasts, and use powerful automated workflows to connect and grow your audience."
            placeholderImage={publishedPlaceholder}
          />
        )}
      </div>
    </Layout>
  );
};
