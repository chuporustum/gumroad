export type FilterType = "date" | "product" | "payment" | "location" | "email_engagement";

// API FilterConfig for backend communication
export type FilterConfig = {
  // Common fields
  operator?:
    | "is_after"
    | "is_before"
    | "between"
    | "has_bought"
    | "has_not_bought"
    | "is_more_than"
    | "is_less_than"
    | "is_between"
    | "is"
    | "is_not"
    | "in_last"
    | "not_in_last";
  condition?:
    | "is_after"
    | "is_before"
    | "between"
    | "has_bought"
    | "has_not_bought"
    | "is_more_than"
    | "is_less_than"
    | "is_between"
    | "is"
    | "is_not"
    | "in_last"
    | "not_in_last";

  // Date filter config
  date?: string;
  start_date?: string;
  end_date?: string;

  // Product filter config
  product_ids?: number[];

  // Payment filter config
  amount?: number;
  amount_cents?: number;
  min_amount_cents?: number;
  max_amount_cents?: number;

  // Location filter config
  country?: string;
  region?: string;
  city?: string;

  // Email engagement filter config
  days?: number;
  engagement_type?: "opened" | "clicked" | "not_opened" | "not_clicked";
};

// UI FilterConfig for frontend components (string values for form inputs)
export interface UIFilterValue {
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

export interface UIFilterConfig {
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
  value: UIFilterValue;
  connector?: "and" | "or" | null;
}

export type AudienceMemberFilter = {
  id?: number;
  filter_type: FilterType;
  config: FilterConfig;
};

export type AudienceMemberFilterGroup = {
  id?: number;
  name: string;
  audience_member_filters: AudienceMemberFilter[];
};

export type Segment = {
  id?: number;
  name: string;
  audience_type?: "customer" | "subscriber" | "affiliate" | "everyone";
  audience_count: number;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  audience_member_filter_groups?: AudienceMemberFilterGroup[];
};

export type SegmentPreview = {
  audience_count: number;
  preview_emails: string[];
};

export type CreateSegmentPayload = {
  segment: {
    name: string;
    audience_type?: "customer" | "subscriber" | "affiliate" | "everyone";
  };
  filter_groups: {
    name: string;
    filters: {
      filter_type: FilterType;
      config: FilterConfig;
    }[];
  }[];
};

export type UpdateSegmentPayload = CreateSegmentPayload;

export type AIGenerationResponse = {
  success: boolean;
  suggested_name?: string;
  filter_groups?: {
    name: string;
    filters: {
      filter_type: FilterType;
      config: FilterConfig;
    }[];
  }[];
  error?: string;
};

async function makeRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      // Include CSRF token for Rails
      "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
      ...options.headers,
    },
    // Include credentials for authentication
    credentials: "same-origin",
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response;
}

export async function getSegments(): Promise<{ segments: Segment[] }> {
  const response = await makeRequest("/internal/segments");
  return await response.json();
}

export async function getSegment(id: number): Promise<{ segment: Segment }> {
  const response = await makeRequest(`/internal/segments/${id}`);
  return await response.json();
}

export async function createSegment(payload: CreateSegmentPayload): Promise<Segment> {
  const response = await makeRequest("/internal/segments", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const responseData: { success: boolean; segment: Segment; errors?: string[] } = await response.json();
  if (!responseData.success) throw new Error(responseData.errors?.join(", ") || "Failed to create segment");

  return responseData.segment;
}

export async function updateSegment(id: number, payload: UpdateSegmentPayload): Promise<Segment> {
  const response = await makeRequest(`/internal/segments/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  const responseData: { success: boolean; segment: Segment; errors?: string[] } = await response.json();
  if (!responseData.success) throw new Error(responseData.errors?.join(", ") || "Failed to update segment");

  return responseData.segment;
}

export async function deleteSegment(id: number): Promise<{ success: boolean }> {
  const response = await makeRequest(`/internal/segments/${id}`, {
    method: "DELETE",
  });

  const responseData: { success: boolean } = await response.json();
  if (!responseData.success) throw new Error("Failed to delete segment");

  return responseData;
}

export async function previewSegment(payload: CreateSegmentPayload): Promise<SegmentPreview> {
  const response = await makeRequest("/internal/segments/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return await response.json();
}

export async function generateWithAI(prompt: string): Promise<AIGenerationResponse> {
  const currentDate = new Date().toISOString().split("T")[0];
  const contextualPrompt = `Current date: ${currentDate}. ${prompt}`;

  const response = await makeRequest("/internal/segments/generate_with_ai", {
    method: "POST",
    body: JSON.stringify({
      description: contextualPrompt,
      current_date: currentDate,
    }),
  });

  const responseData: AIGenerationResponse = await response.json();

  if (!responseData.success) {
    let userFriendlyError =
      "I'm having trouble creating that segment. Try simplifying your request or create the segment manually using the filters below.";

    if (responseData.error) {
      if (responseData.error.includes("unable to parse") || responseData.error.includes("failed to generate")) {
        userFriendlyError =
          "I couldn't understand that request. Try being more specific about the criteria you want, like 'customers who spent more than $50' or 'subscribers who joined in the last 30 days'.";
      } else if (responseData.error.includes("timeout") || responseData.error.includes("service")) {
        userFriendlyError =
          "The AI service is temporarily unavailable. Please try again in a moment or create your segment manually.";
      } else {
        userFriendlyError = responseData.error;
      }
    }

    throw new Error(userFriendlyError);
  }

  return responseData;
}
