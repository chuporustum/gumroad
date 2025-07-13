import cx from "classnames";
import { addHours, format, startOfDay, startOfHour } from "date-fns";
import React from "react";
import { Link, Location, useLoaderData, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { cast } from "ts-safe-cast";

import {
  AudienceType,
  createInstallment,
  Installment,
  InstallmentFormContext,
  updateInstallment,
} from "$app/data/installments";
import { getSegments } from "$app/data/segments";
import { asyncVoid } from "$app/utils/promise";
import { assertResponseError } from "$app/utils/request";

import { Button } from "$app/components/Button";
import { useDomains } from "$app/components/DomainSettings";
import { filesReducer, isFileUploading, mapEmailFilesToFileState } from "$app/components/EmailAttachments";
import { EvaporateUploaderProvider } from "$app/components/EvaporateUploader";
import { convertUIFilterToAPI, RecipientsFilterPanel, useFilterWidth } from "$app/components/FilterBuilder";
import { type FilterGroup } from "$app/components/server-components/EmailsPage/FilterGroup";
import { Icon } from "$app/components/Icons";
import { Popover } from "$app/components/Popover";
import { S3UploadConfigProvider } from "$app/components/S3UploadConfig";
import { showAlert } from "$app/components/server-components/Alert";
import { editEmailPath, emailTabPath, newEmailPath } from "$app/components/server-components/EmailsPage";
import { useConfigureEvaporate } from "$app/components/useConfigureEvaporate";
import { useRunOnce } from "$app/components/useRunOnce";

type ProductOrVariantOption = {
  id: string;
  productPermalink: string;
  label: string;
  archived: boolean;
  type: "product" | "variant";
};

type InvalidFieldName =
  | "channel"
  | "paidMoreThan"
  | "paidLessThan"
  | "afterDate"
  | "beforeDate"
  | "title"
  | "scheduleDate"
  | "publishDate";
type SaveAction =
  | "save"
  | "save_and_preview_email"
  | "save_and_preview_post"
  | "save_and_schedule"
  | "save_and_publish";

const getRecipientType = (audienceType: AudienceType, boughtItems: ProductOrVariantOption[]) => {
  if (audienceType === "everyone") return "audience";
  if (audienceType === "followers") return "follower";
  if (audienceType === "affiliates") return "affiliate";
  if (boughtItems.length === 1) return boughtItems[0]?.type === "variant" ? "variant" : "product";
  return "seller";
};

const getAudienceType = (installmentType: string): AudienceType => {
  switch (installmentType) {
    case "everyone":
      return "everyone";
    case "customers":
      return "customers";
    case "affiliates":
      return "affiliates";
    default:
      return "everyone";
  }
};

const toISODateString = (date: Date | string | undefined | null) => (date ? format(date, "yyyy-MM-dd") : "");

export const EmailForm = () => {
  const uid = React.useId();
  const { context, installment } = cast<{ context: InstallmentFormContext; installment: Installment | null }>(
    useLoaderData(),
  );
  const hasAudience = context.audience_types.length > 0;
  const [audienceType, setAudienceType] = React.useState<AudienceType>(
    installment ? getAudienceType(installment.installment_type) : "everyone",
  );
  const [channel, setChannel] = React.useState<{ email: boolean; profile: boolean }>({
    email: installment?.send_emails ?? hasAudience,
    profile: installment?.shown_on_profile ?? true,
  });
  const [filtersData, setFiltersData] = React.useState<{
    audienceType: string;
    segmentIds?: string[];
    filterGroups?: FilterGroup[];
  }>({ audienceType });

  // Use shared filter width logic
  const { containerWidth, formMinWidth, isWideLayout } = useFilterWidth(filtersData.filterGroups);

  const [searchParams] = useSearchParams();
  const routerLocation = cast<Location<{ from?: string | undefined } | null>>(useLocation());
  const [bought] = React.useState<string[]>(() => {
    if (installment?.bought_products?.length || installment?.bought_variants?.length) {
      return [...(installment.bought_products ?? []), ...(installment.bought_variants ?? [])];
    }
    return searchParams.get("bought")?.split(",") ?? [];
  });
  const [notBought] = React.useState<string[]>(
    installment?.not_bought_products ?? installment?.not_bought_variants ?? [],
  );
  const [paidMoreThanCents] = React.useState<number | null>(installment?.paid_more_than_cents ?? null);
  const [paidLessThanCents] = React.useState<number | null>(installment?.paid_less_than_cents ?? null);
  const [afterDate] = React.useState(installment?.created_after ?? "");
  const [beforeDate] = React.useState(installment?.created_before ?? "");
  const [fromCountry] = React.useState(installment?.bought_from ?? "");
  const [affiliatedProducts] = React.useState<string[]>(installment?.affiliate_products ?? []);
  const [allowComments, setAllowComments] = React.useState(
    installment?.allow_comments ?? context.allow_comments_by_default,
  );
  const [title, setTitle] = React.useState(installment?.name ?? "");
  const [preheader, setPreheader] = React.useState(installment?.preheader ?? "");
  const [message] = React.useState(installment?.message ?? "");
  const [scheduleDate] = React.useState<Date | null>(startOfHour(addHours(new Date(), 1)));
  const titleRef = React.useRef<HTMLInputElement>(null);
  const sendEmailRef = React.useRef<HTMLInputElement>(null);
  const paidMoreThanRef = React.useRef<HTMLInputElement>(null);
  const publishDateRef = React.useRef<HTMLInputElement>(null);
  const [imagesUploading] = React.useState<Set<File>>(new Set());
  useDomains();
  const { evaporateUploader, s3UploadConfig } = useConfigureEvaporate({
    aws_access_key_id: context.aws_access_key_id,
    s3_url: context.s3_url,
    user_id: context.user_id,
  });
  const [files] = React.useReducer(
    filesReducer,
    installment?.external_id ? mapEmailFilesToFileState(installment.files, uid) : [],
  );
  const [internalTag, setInternalTag] = React.useState(installment?.internal_tag ?? "");
  const isPublished = !!(installment?.external_id && installment.published_at);
  const [publishDate, setPublishDate] = React.useState(
    installment?.published_at ? toISODateString(installment.published_at) : "",
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [invalidFields, setInvalidFields] = React.useState<Set<InvalidFieldName>>(new Set());

  React.useEffect(() => {
    const fetchSegments = async () => {
      try {
        await getSegments();
        // Segments are handled by RecipientsFilterPanel now
      } catch (e) {
        console.error("Failed to fetch segments:", e);
        // TODO: In production, replace with proper error tracking service
        // Example: errorTracker.captureException(e, { context: 'fetchSegments' });
      }
    };
    fetchSegments();
  }, []);

  const productOptions = React.useMemo(
    () =>
      context.products.flatMap((product) => [
        {
          id: product.permalink,
          productPermalink: product.permalink,
          label: product.name,
          archived: product.archived,
          type: "product" as const,
        },
        ...product.variants.map((variant) => ({
          id: variant.id,
          productPermalink: product.permalink,
          label: `${product.name} - ${variant.name}`,
          archived: product.archived,
          type: "variant" as const,
        })),
      ]),
    [context.products],
  );

  useRunOnce(() => {
    if (routerLocation.pathname !== newEmailPath || searchParams.size === 0) return;

    const tier = searchParams.get("tier");
    const permalink = searchParams.get("product");
    const productName = productOptions.find((option) => option.id === permalink)?.label;
    const canSendToCustomers = context.audience_types.includes("customers");
    const template = searchParams.get("template");
    const isBundleMarketing = template === "bundle_marketing";

    if (template === "content_updates" && permalink) {
      setTitle(`New content added to ${productName}`);
      setAudienceType("customers");
      setChannel({ profile: false, email: true });
      return;
    }

    if (tier !== null && productOptions.findIndex((option) => option.id === tier) !== -1 && canSendToCustomers) {
      setAudienceType("customers");
    } else if (permalink !== null && productName) {
      if (canSendToCustomers) {
        setAudienceType("customers");
      }
      setTitle(`${productName} - updated!`);
    } else if (isBundleMarketing) {
      if (canSendToCustomers) {
        setAudienceType("customers");
      }
      setChannel((prev) => ({ ...prev, profile: false }));
      const bundleName = searchParams.get("bundle_name");
      if (bundleName) {
        setTitle(`Introducing ${bundleName}`);
      }
    }
  });

  const filterByType = (type: ProductOrVariantOption["type"], ids: string[]) =>
    productOptions.filter((option) => option.type === type && ids.includes(option.id));
  const boughtProducts =
    audienceType === "customers" || audienceType === "followers" ? filterByType("product", bought) : [];
  const boughtVariants =
    audienceType === "customers" || audienceType === "followers" ? filterByType("variant", bought) : [];
  const notBoughtProducts = audienceType === "affiliates" ? [] : filterByType("product", notBought);
  const notBoughtVariants = audienceType === "affiliates" ? [] : filterByType("variant", notBought);
  const boughtItems = [...boughtProducts, ...boughtVariants];
  const recipientType = getRecipientType(audienceType, boughtItems);
  const productId =
    recipientType === "product" || recipientType === "variant" ? (boughtItems[0]?.productPermalink ?? null) : null;
  const variantId = recipientType === "variant" ? (boughtVariants[0]?.id ?? null) : null;
  const filtersPayload = {
    installment_type: recipientType,
    send_emails: channel.email,
    shown_on_profile: channel.profile,
    allow_comments: allowComments,
    segment_ids: filtersData.segmentIds ? filtersData.segmentIds.map(Number) : [],
    paid_more_than_cents: paidMoreThanCents,
    paid_less_than_cents: paidLessThanCents,
    bought_from: fromCountry,
    created_after: afterDate,
    created_before: beforeDate,
    bought_products: boughtProducts.map((p) => p.id),
    bought_variants: boughtVariants.map((v) => v.id),
    not_bought_products: notBoughtProducts.map((p) => p.id),
    not_bought_variants: notBoughtVariants.map((v) => v.id),
    affiliate_products: affiliatedProducts,
    filters_payload: filtersData.filterGroups
      ? {
          audience_type: filtersData.audienceType,
          filter_groups: filtersData.filterGroups.map((group) => ({
            name: group.id,
            filters: group.filters.map((filter) => convertUIFilterToAPI(filter)),
          })),
        }
      : null,
  };

  const validate = (action: SaveAction) => {
    const invalidFieldRefsAndErrors: [React.RefObject<HTMLElement> | null, string][] = [];
    const invalidFieldNames = new Set<InvalidFieldName>();

    if (title.trim() === "") {
      invalidFieldNames.add("title");
      invalidFieldRefsAndErrors.push([titleRef, "Please set a title."]);
    }

    if (!channel.email && !channel.profile) {
      invalidFieldNames.add("channel");
      invalidFieldRefsAndErrors.push([sendEmailRef, "Please set at least one channel for your update."]);
    }

    if (
      audienceType === "customers" &&
      !isPublished &&
      paidMoreThanCents &&
      paidLessThanCents &&
      paidMoreThanCents > paidLessThanCents
    ) {
      invalidFieldNames.add("paidMoreThan");
      invalidFieldNames.add("paidLessThan");
      invalidFieldRefsAndErrors.push([paidMoreThanRef, "Please enter valid paid more than and paid less than values."]);
    }

    if (hasAudience && !isPublished && afterDate && beforeDate && new Date(afterDate) > new Date(beforeDate)) {
      invalidFieldNames.add("afterDate");
      invalidFieldNames.add("beforeDate");
      invalidFieldRefsAndErrors.push([null, "Please enter valid before and after dates."]);
    }

    if (action === "save_and_schedule" && (!scheduleDate || new Date(scheduleDate) < new Date())) {
      invalidFieldNames.add("scheduleDate");
      invalidFieldRefsAndErrors.push([null, "Please select a date and time in the future."]);
    }

    if (
      action !== "save_and_publish" &&
      action !== "save_and_schedule" &&
      isPublished &&
      publishDate &&
      startOfDay(publishDate) > new Date()
    ) {
      invalidFieldNames.add("publishDate");
      invalidFieldRefsAndErrors.push([publishDateRef, "Please enter a publish date in the past."]);
    }

    setInvalidFields(invalidFieldNames);
    const invalidFieldRefAndError = invalidFieldRefsAndErrors[0];
    if (invalidFieldRefAndError) {
      invalidFieldRefAndError[0]?.current?.focus();
      showAlert(invalidFieldRefAndError[1], "error");
    }

    return invalidFieldNames.size === 0;
  };
  const markFieldAsValid = (fieldName: InvalidFieldName) => {
    if (invalidFields.has(fieldName)) {
      setInvalidFields((prev) => {
        const updated = new Set(prev);
        updated.delete(fieldName);
        return updated;
      });
    }
  };
  const navigate = useNavigate();
  const save = asyncVoid(async (action: SaveAction = "save") => {
    if (!validate(action)) return;

    const payload = {
      installment: {
        name: title,
        message: message || "Write a personalized message...",
        preheader,
        internal_tag: internalTag,
        files: files.map((file, position) => ({
          external_id: file.id,
          position,
          url: file.url,
          stream_only: file.is_streamable && false,
          subtitle_files: file.subtitle_files,
        })),
        link_id: productId,
        published_at:
          isPublished &&
          publishDate !== toISODateString(installment?.published_at) &&
          action !== "save_and_schedule" &&
          action !== "save_and_publish"
            ? publishDate
            : null,
        shown_in_profile_sections: audienceType === "everyone" && channel.profile ? [] : [],
        ...filtersPayload,
      },
      variant_external_id: variantId,
      send_preview_email: action === "save_and_preview_email",
      to_be_published_at: action === "save_and_schedule" ? scheduleDate : null,
      publish: action === "save_and_publish",
    };

    try {
      setIsSaving(true);
      const response = installment?.external_id
        ? await updateInstallment(installment.external_id, payload)
        : await createInstallment(payload);
      showAlert(
        action === "save_and_preview_email"
          ? "A preview has been sent to your email."
          : action === "save_and_preview_post"
            ? "Preview link opened."
            : action === "save_and_schedule"
              ? "Email successfully scheduled!"
              : action === "save_and_publish"
                ? `Email successfully ${channel.profile ? "published" : "sent"}!`
                : installment?.external_id
                  ? "Changes saved!"
                  : "Email created!",
        "success",
      );
      if (action === "save_and_preview_post") {
        window.open(response.full_url, "_blank");
      }

      if (action === "save_and_schedule") {
        navigate(emailTabPath("scheduled"));
      } else if (action === "save_and_publish") {
        navigate(emailTabPath("published"));
      } else {
        navigate(editEmailPath(response.installment_id), {
          replace: true,
          state: { from: routerLocation.state?.from },
        });
      }
    } catch (e) {
      assertResponseError(e);
      showAlert(e.message, "error", { html: true });
    } finally {
      setIsSaving(false);
    }
  });
  const isBusy =
    isSaving ||
    imagesUploading.size > 0 ||
    files.some((file) => isFileUploading(file) || file.subtitle_files.some(isFileUploading));

  const cancelPath =
    routerLocation.state?.from ?? emailTabPath(context.has_scheduled_emails ? "scheduled" : "published");

  return (
    <main>
      <header>
        <h1>{installment?.external_id ? "Edit email" : "New email"}</h1>
        <div className="actions">
          <Link to={cancelPath} className="button" inert={isBusy}>
            <Icon name="x-square" />
            Cancel
          </Link>
          <Button color="accent" disabled={isBusy} onClick={() => save()}>
            Save and continue
          </Button>
        </div>
      </header>
      <section>
        <div
          style={{
            display: "flex",
            gap: "var(--spacer-5)",
            maxWidth: containerWidth,
            width: "100%",
            margin: "0 auto",
            transition: "max-width 0.3s ease",
            alignItems: "flex-start",
          }}
        >
          <div
            className="top-12 lg:sticky"
            style={{
              maxWidth: "15rem",
              minWidth: "15rem",
              flexShrink: 0,
              position: isWideLayout ? "static" : "sticky",
              top: isWideLayout ? "auto" : "3rem",
            }}
          >
            <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
              Post updates to your profile, send email broadcasts, and automate your way to audience growth.
            </p>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <S3UploadConfigProvider value={s3UploadConfig}>
              <EvaporateUploaderProvider value={evaporateUploader}>
                <div
                  style={{
                    display: "grid",
                    gap: "var(--spacer-5)",
                    width: "100%",
                    maxWidth: "none",
                    minWidth: formMinWidth,
                    transition: "all 0.3s ease",
                    overflow: "visible",
                  }}
                >
                  <fieldset className={cx({ danger: invalidFields.has("title") })}>
                    <legend>
                      <label htmlFor={`${uid}-subject-input`}>Subject</label>
                    </legend>
                    <input
                      id={`${uid}-subject-input`}
                      ref={titleRef}
                      type="text"
                      placeholder="Subject"
                      maxLength={255}
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        markFieldAsValid("title");
                      }}
                    />
                  </fieldset>

                  <fieldset>
                    <legend>
                      <label htmlFor={`${uid}-preheader-input`}>Preheader</label>
                    </legend>
                    <input
                      id={`${uid}-preheader-input`}
                      type="text"
                      maxLength={255}
                      value={preheader}
                      onChange={(e) => setPreheader(e.target.value)}
                    />
                    <small style={{ marginTop: "var(--spacer-1)" }}>
                      Appears below the subject line, offering a quick preview of your email.
                    </small>
                  </fieldset>
                  {/* Channel selection */}
                  <fieldset>
                    <legend id="channel-group-label">Channel</legend>
                    <div
                      className="radio-buttons"
                      role="radiogroup"
                      aria-labelledby="channel-group-label"
                      aria-required="true"
                      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))" }}
                    >
                      {[
                        {
                          id: "all",
                          title: "All channels",
                          description: "Reach everyone—send an email and post to your profile.",
                          icon: "solid-hand",
                          value: { email: true, profile: true },
                        },
                        {
                          id: "email",
                          title: "Email",
                          description: "Send an email to your chosen audience.",
                          icon: "envelope-fill",
                          value: { email: true, profile: false },
                        },
                        {
                          id: "post",
                          title: "Post",
                          description: "Publish a post to your profile to your chosen audience.",
                          icon: "solid-document-text",
                          value: { email: false, profile: true },
                        },
                      ].map((opt) => {
                        const isActive = channel.email === opt.value.email && channel.profile === opt.value.profile;
                        return (
                          <Button
                            key={opt.id}
                            className="vertical"
                            role="radio"
                            aria-checked={isActive}
                            aria-describedby={`${opt.id}-description`}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => setChannel(opt.value)}
                            onKeyDown={(e) => {
                              if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                setChannel(opt.value);
                              }
                            }}
                          >
                            <Icon name={opt.icon as any} style={{ fontSize: "2rem" }} />
                            <div>
                              <h4>{opt.title}</h4>
                              <div id={`${opt.id}-description`}>{opt.description}</div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </fieldset>
                  {/* Allow comments */}
                  {channel.profile ? (
                    <label style={{ display: "flex", alignItems: "center", gap: "var(--spacer-2)" }}>
                      <input
                        type="checkbox"
                        checked={allowComments}
                        onChange={(e) => setAllowComments(e.target.checked)}
                      />
                      Allow comments in your post
                    </label>
                  ) : null}
                  {isPublished ? (
                    <fieldset className={cx({ danger: invalidFields.has("publishDate") })}>
                      <input
                        ref={publishDateRef}
                        type="date"
                        placeholder="Publish date"
                        id={`${uid}-publish_date`}
                        value={publishDate}
                        onChange={(event) => {
                          setPublishDate(event.target.value);
                          markFieldAsValid("publishDate");
                        }}
                        max={toISODateString(new Date())}
                      />
                    </fieldset>
                  ) : null}

                  <div style={{ width: "100%", overflow: "visible" }}>
                    <RecipientsFilterPanel
                      audienceType={audienceType}
                      onAudienceTypeChange={(type) => {
                        const isValidAudienceType = (t: string): t is AudienceType => {
                          return ["everyone", "customers", "affiliates", "followers"].includes(t);
                        };
                        setAudienceType(isValidAudienceType(type) ? type : "everyone");
                      }}
                      onFiltersChange={setFiltersData}
                      disabled={!!isPublished}
                    />
                  </div>

                  {/* Internal tag */}
                  <div style={{ width: "100%", overflow: "visible" }}>
                    <div style={{ display: "grid", gap: "var(--spacer-4)" }}>
                      <fieldset>
                        <legend>Internal tag</legend>
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
                              {internalTag || "Select a tag"} <Icon name="outline-cheveron-down" />
                            </div>
                          }
                        >
                          {(close) => (
                            <ul role="menu">
                              <li
                                role="menuitemradio"
                                aria-checked={internalTag === ""}
                                onClick={() => {
                                  setInternalTag("");
                                  close();
                                }}
                              >
                                <span>Select a tag</span>
                              </li>
                              {[
                                { value: "announcements", label: "Announcements" },
                                { value: "updates", label: "Updates" },
                                { value: "newsletter", label: "Newsletter" },
                                { value: "promotions", label: "Promotions" },
                                { value: "content", label: "Content" },
                              ].map((option) => (
                                <li
                                  key={option.value}
                                  role="menuitemradio"
                                  aria-checked={option.value === internalTag}
                                  onClick={() => {
                                    setInternalTag(option.value);
                                    close();
                                  }}
                                >
                                  <span>{option.label}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </Popover>
                        <small style={{ marginTop: "var(--spacer-1)", color: "#666" }}>
                          This is for your reference only to help filter your emails, recipients will not see it.
                        </small>
                      </fieldset>
                    </div>
                  </div>
                </div>
              </EvaporateUploaderProvider>
            </S3UploadConfigProvider>
          </div>
        </div>
      </section>
    </main>
  );
};
