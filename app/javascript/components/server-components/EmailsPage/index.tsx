import cx from "classnames";
import React from "react";
import { Link, RouteObject, RouterProvider, createBrowserRouter, json, useLocation } from "react-router-dom";
import { StaticRouterProvider } from "react-router-dom/server";

import {
  SavedInstallment,
  getDraftInstallments,
  getEditInstallment,
  getNewInstallment,
  getPublishedInstallments,
  getScheduledInstallments,
  previewInstallment,
} from "$app/data/installments";
import { getSegment } from "$app/data/segments";
import { assertDefined } from "$app/utils/assert";
import { formatStatNumber } from "$app/utils/formatStatNumber";
import { asyncVoid } from "$app/utils/promise";
import { assertResponseError } from "$app/utils/request";
import { GlobalProps, buildStaticRouter, register } from "$app/utils/serverComponentUtil";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { Popover } from "$app/components/Popover";
import { showAlert } from "$app/components/server-components/Alert";
import { DraftsTab } from "$app/components/server-components/EmailsPage/DraftsTab";
import { EmailForm } from "$app/components/server-components/EmailsPage/EmailForm";
import { NewSegmentPage } from "$app/components/server-components/EmailsPage/NewSegmentPage";
import { PublishedTab } from "$app/components/server-components/EmailsPage/PublishedTab";
import { ScheduledTab } from "$app/components/server-components/EmailsPage/ScheduledTab";
import { SegmentEditPage } from "$app/components/server-components/EmailsPage/SegmentEditPage";
import { SegmentsTab } from "$app/components/server-components/EmailsPage/SegmentsTab";
import { WithTooltip } from "$app/components/WithTooltip";

const TABS = ["published", "scheduled", "drafts", "segments", "subscribers"] as const;

export const emailTabPath = (tab: (typeof TABS)[number]) => `/emails/${tab}`;
export const newEmailPath = "/emails/new";
export const editEmailPath = (id: string) => `/emails/${id}/edit`;
export const editSegmentPath = (id: string) => `/emails/segments/${id}/edit`;
export const newSegmentPath = "/emails/segments/new";

export const Layout = ({
  selectedTab,
  children,
  filterComponent,
}: {
  selectedTab: (typeof TABS)[number];
  children: React.ReactNode;
  filterComponent?: React.ReactNode;
}) => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = React.useState(false);
  const [query, setQuery] = useSearchContext();
  React.useEffect(() => {
    if (isSearchPopoverOpen) searchInputRef.current?.focus();
  }, [isSearchPopoverOpen]);

  return (
    <main>
      <header>
        <h1>Emails</h1>

        <div className="actions">
          <Popover
            open={isSearchPopoverOpen}
            onToggle={setIsSearchPopoverOpen}
            aria-label="Toggle Search"
            trigger={
              <WithTooltip tip="Search" position="bottom">
                <div className="button">
                  <Icon name="solid-search" />
                </div>
              </WithTooltip>
            }
          >
            <div className="input">
              <Icon name="solid-search" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search emails"
                value={query}
                onChange={(evt) => setQuery(evt.target.value)}
              />
            </div>
          </Popover>

          {filterComponent}

          {selectedTab === "segments" ? <NewSegmentButton /> : <NewEmailButton />}
        </div>

        <div role="tablist">
          {TABS.map((tab) =>
            tab === "subscribers" ? (
              <a href={Routes.followers_path()} role="tab" key={tab}>
                Subscribers
              </a>
            ) : (
              <Link to={emailTabPath(tab)} role="tab" aria-selected={selectedTab === tab} key={tab}>
                {tab === "published"
                  ? "Published"
                  : tab === "scheduled"
                    ? "Scheduled"
                    : tab === "drafts"
                      ? "Drafts"
                      : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        tab === "segments"
                        ? "Segments"
                        : tab}
              </Link>
            ),
          )}
        </div>
      </header>
      {children}
    </main>
  );
};

export const NewEmailButton = ({ copyFrom }: { copyFrom?: string }) => {
  const { pathname: from } = useLocation();
  return (
    <Link
      className={cx("button", { accent: !copyFrom })}
      to={copyFrom ? `${newEmailPath}?copy_from=${copyFrom}` : newEmailPath}
      state={{ from }}
    >
      {copyFrom ? "Duplicate" : "New email"}
    </Link>
  );
};

export const NewSegmentButton = () => {
  const { pathname: from } = useLocation();
  return (
    <Link className={cx("button", "accent")} to={newSegmentPath} state={{ from }}>
      <Icon name="plus" />
      New segment
    </Link>
  );
};

export const EditEmailButton = ({ id }: { id: string }) => {
  const { pathname: from } = useLocation();
  return (
    <Link className="button" to={editEmailPath(id)} state={{ from }}>
      Edit
    </Link>
  );
};

export const ViewEmailButton = (props: { installment: SavedInstallment }) => {
  const [sendingPreviewEmail, setSendingPreviewEmail] = React.useState(false);

  return (
    <Button
      disabled={sendingPreviewEmail}
      onClick={asyncVoid(async () => {
        setSendingPreviewEmail(true);
        try {
          await previewInstallment(props.installment.external_id);
          showAlert("A preview has been sent to your email.", "success");
        } catch (error) {
          assertResponseError(error);
          showAlert(error.message, "error");
        } finally {
          setSendingPreviewEmail(false);
        }
      })}
    >
      <Icon name="envelope-fill"></Icon>
      {sendingPreviewEmail ? "Sending..." : "View email"}
    </Button>
  );
};

export const EmptyStatePlaceholder = ({
  title,
  description,
  placeholderImage,
}: {
  title: string;
  description: string;
  placeholderImage: string;
}) => (
  <div className="placeholder">
    <figure>
      <img src={placeholderImage} />
    </figure>
    <h2>{title}</h2>
    <p>{description}</p>
    <NewEmailButton />
    <p>
      <a data-helper-prompt="How do I send an update email?">Learn more about emails</a>
    </p>
  </div>
);

export type AudienceCounts = Map<string, number | "loading" | "failed">;
export const audienceCountValue = (audienceCounts: AudienceCounts, installmentId: string) => {
  const count = audienceCounts.get(installmentId);
  return count === undefined || count === "loading"
    ? null
    : count === "failed"
      ? "--"
      : formatStatNumber({ value: count });
};

const routes: RouteObject[] = [
  {
    path: emailTabPath("published"),
    element: <PublishedTab />,
    loader: async () => json(await getPublishedInstallments({ page: 1, query: "" }).response, { status: 200 }),
  },
  {
    path: emailTabPath("scheduled"),
    element: <ScheduledTab />,
    loader: async () => json(await getScheduledInstallments({ page: 1, query: "" }).response, { status: 200 }),
  },
  {
    path: emailTabPath("drafts"),
    element: <DraftsTab />,
    loader: async () => json(await getDraftInstallments({ page: 1, query: "" }).response, { status: 200 }),
  },
  {
    path: emailTabPath("segments"),
    element: <SegmentsTab />,
  },
  {
    path: editSegmentPath(":id"),
    element: <SegmentEditPage />,
    loader: async ({ params }) => {
      const response = await getSegment(Number(assertDefined(params.id, "Segment ID is required")));
      return json(response.segment, { status: 200 });
    },
  },
  {
    path: newEmailPath,
    element: <EmailForm />,
    loader: async ({ request }) =>
      json(await getNewInstallment(new URL(request.url).searchParams.get("copy_from")), {
        status: 200,
      }),
  },
  {
    path: editEmailPath(":id"),
    element: <EmailForm />,
    loader: async ({ params }) =>
      json(await getEditInstallment(assertDefined(params.id, "Installment ID is required")), { status: 200 }),
  },
  {
    path: newSegmentPath,
    element: <NewSegmentPage />,
  },
];

const SearchContext = React.createContext<[string, (thing: string) => void] | null>(null);
export const useSearchContext = () => assertDefined(React.useContext(SearchContext));

const EmailsPage = () => {
  const router = createBrowserRouter(routes);
  const queryState = React.useState("");

  return (
    <SearchContext.Provider value={queryState}>
      <RouterProvider router={router} />
    </SearchContext.Provider>
  );
};

const EmailsRouter = async (global: GlobalProps) => {
  const { router, context } = await buildStaticRouter(global, routes);
  const component = () => (
    <SearchContext.Provider value={["", () => {}]}>
      <StaticRouterProvider router={router} context={context} nonce={global.csp_nonce} />
    </SearchContext.Provider>
  );
  component.displayName = "EmailsRouter";
  return component;
};

export default register({ component: EmailsPage, ssrComponent: EmailsRouter, propParser: () => ({}) });
