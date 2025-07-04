import React from "react";
import { useParams } from "react-router-dom";

import { getSegment, type Segment } from "$app/data/segments";
import { LoadingSpinner } from "$app/components/LoadingSpinner";
import { showAlert } from "$app/components/server-components/Alert";

import { SegmentForm } from "./SegmentForm";

export const SegmentEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [segment, setSegment] = React.useState<Segment | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchSegment = async () => {
      if (!id) {
        setError("Segment ID is required");
        setIsLoading(false);
        return;
      }

      try {
        const response = await getSegment(parseInt(id, 10));
        setSegment(response.segment);
      } catch (err: any) {
        setError(err.message || "Failed to load segment");
        showAlert(err.message || "Failed to load segment", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSegment();
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !segment) {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacer-8)" }}>
        <h2 style={{ color: "var(--color-danger)" }}>Error</h2>
        <p>{error || "Segment not found"}</p>
      </div>
    );
  }

  return <SegmentForm segment={segment} />;
};
