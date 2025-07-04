/* eslint-disable no-alert */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { getSegments, deleteSegment, type Segment } from "$app/data/segments";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { Popover } from "$app/components/Popover";
import { Layout, editSegmentPath, newSegmentPath } from "$app/components/server-components/EmailsPage";

export const SegmentsTab = () => {
  const navigate = useNavigate();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSegments = async () => {
    setIsLoading(true);
    try {
      const response = await getSegments();
      setSegments(response.segments);
    } catch (e) {
      console.error("Failed to fetch segments:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const handleDelete = async (segment: Segment) => {
    if (segment.id && confirm("Are you sure you want to delete this segment?")) {
      try {
        await deleteSegment(segment.id);
        await fetchSegments();
      } catch (e) {
        console.error("Failed to delete segment:", e);
      }
    }
  };

  const handleEdit = (segment: Segment) => {
    navigate(editSegmentPath(String(segment.id)));
  };

  const handleNewSegment = () => {
    navigate(newSegmentPath);
  };

  return (
    <Layout selectedTab="segments">
      <div style={{ padding: "var(--spacer-6)", width: "100%" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "var(--spacer-8)" }}>Loading segments...</div>
        ) : segments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "var(--spacer-12)" }}>
            <div style={{ fontSize: "4rem", marginBottom: "var(--spacer-4)", opacity: 0.5 }}>📊</div>
            <h3 style={{ marginBottom: "var(--spacer-2)" }}>No segments yet</h3>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--spacer-4)" }}>
              Create your first audience segment to get started
            </p>
            <Button color="primary" onClick={handleNewSegment}>
              <Icon name="plus" />
              Create segment
            </Button>
          </div>
        ) : (
          <table style={{ width: "100%", marginBottom: "var(--spacer-4)" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Created</th>
                <th>Last used</th>
                <th>Audience</th>
                <th>Opens</th>
                <th>Clicks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment) => (
                <tr key={segment.id}>
                  <td>{segment.name}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(segment.created_at).toLocaleDateString()}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {segment.last_used_at ? new Date(segment.last_used_at).toLocaleDateString() : "Never"}
                  </td>
                  <td>{segment.audience_count.toLocaleString()}</td>
                  <td>0%</td>
                  <td>0%</td>
                  <td>
                    <Popover
                      aria-label="Open segment action menu"
                      trigger={
                        <div className="button">
                          <Icon name="three-dots" />
                        </div>
                      }
                    >
                      <div role="menu">
                        <div role="menuitem" onClick={() => handleEdit(segment)}>
                          <Icon name="pencil" />
                          &ensp;Edit
                        </div>
                        <div role="menuitem" className="danger" onClick={() => handleDelete(segment)}>
                          <Icon name="trash2" />
                          &ensp;Delete
                        </div>
                      </div>
                    </Popover>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};
