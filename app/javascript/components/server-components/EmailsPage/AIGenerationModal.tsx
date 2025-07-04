import React from "react";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { Popover } from "$app/components/Popover";

interface AIGenerationModalProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

export const AIGenerationModal: React.FC<AIGenerationModalProps> = ({ onGenerate, isGenerating }) => {
  const [prompt, setPrompt] = React.useState("");

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt.trim());
      setPrompt("");
    }
  };

  return (
    <Popover
      trigger={
        <Button outline disabled={isGenerating}>
          <Icon name="lighting-fill" />
          Generate with AI
        </Button>
      }
      position="bottom"
      aria-label="Segment filter"
    >
      {(close) => (
        <div
          style={{
            padding: "var(--spacer-4)",
            minWidth: "350px",
            maxWidth: "400px",
            display: "flex",
            flexDirection: "column",
            gap: "var(--spacer-3)",
          }}
        >
          <fieldset>
            <legend>
              <label htmlFor="ai-prompt">Segment filter</label>
            </legend>
            <textarea
              id="ai-prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., customers who bought digital products in the last 3 months from the US"
              style={{ width: "100%", resize: "vertical", minHeight: "60px" }}
              disabled={isGenerating}
            />
          </fieldset>

          <div style={{ display: "flex", gap: "var(--spacer-2)", justifyContent: "flex-end" }}>
            <Button outline onClick={close} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleGenerate();
                close();
              }}
              disabled={!prompt.trim() || isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      )}
    </Popover>
  );
};
