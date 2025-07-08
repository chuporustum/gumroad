import React from "react";
import { Link, useLoaderData, useNavigate } from "react-router-dom";
import { cast } from "ts-safe-cast";

import { updateInstallment, type Installment, type InstallmentFormContext } from "$app/data/installments";
import { asyncVoid } from "$app/utils/promise";
import { assertResponseError } from "$app/utils/request";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { RichTextEditor } from "$app/components/RichTextEditor";
import { showAlert } from "$app/components/server-components/Alert";
import { emailTabPath } from "$app/components/server-components/EmailsPage";

export const EmailEditor = () => {
  const uid = React.useId();
  const { installment } = cast<{ context: InstallmentFormContext; installment: Installment }>(useLoaderData());
  const navigate = useNavigate();

  const [name, setName] = React.useState(installment?.name ?? "");
  const [message, setMessage] = React.useState(installment?.message ?? "");
  const [isSaving, setIsSaving] = React.useState(false);

  const save = asyncVoid(async (publish = false) => {
    if (!installment?.external_id) return;

    setIsSaving(true);
    try {
      const payload = {
        installment: {
          name: name,
          message: message,
        },
        publish,
      } as any;

      await updateInstallment(installment.external_id, payload);

      if (publish) {
        showAlert("Email published successfully!", "success");
        navigate(emailTabPath("published"));
      } else {
        showAlert("Changes saved!", "success");
      }
    } catch (e) {
      assertResponseError(e);
      showAlert(e.message, "error", { html: true });
    } finally {
      setIsSaving(false);
    }
  });

  return (
    <main>
      <header>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <h1>{installment?.name || "Edit email"}</h1>
          <div className="actions">
            <Link
              to={emailTabPath("drafts")}
              className="button"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Icon name="arrow-left" />
              Back
            </Link>
            <Button onClick={() => save(false)} disabled={isSaving}>
              Save changes
            </Button>
            <Button color="accent" onClick={() => save(true)} disabled={isSaving}>
              Publish
            </Button>
          </div>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "var(--spacer-5)",
          width: "100%",
          maxWidth: "none",
          padding: "0 var(--spacer-4)",
          minHeight: "calc(100vh - 200px)",
        }}
      >
        {/* Editor Section */}
        <div
          style={{
            minWidth: 0,
            padding: "var(--spacer-4)",
            paddingRight: "var(--spacer-5)",
            borderRight: "1px solid #000",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "grid", gap: "var(--spacer-4)" }}>
            {/* Subject Field */}
            <fieldset>
              <legend>
                <label htmlFor={`${uid}-subject-input`}>Subject</label>
              </legend>
              <input
                id={`${uid}-subject-input`}
                type="text"
                placeholder="Subject"
                maxLength={255}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  height: "48px",
                  border: "1px solid #000",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  boxSizing: "border-box",
                }}
              />
            </fieldset>

            {/* Rich Text Editor */}
            <div>
              <div style={{ width: "100%" }}>
                <div
                  style={{
                    minHeight: "400px",
                    border: "1px solid #000",
                    borderRadius: "4px",
                    backgroundColor: "white",
                  }}
                >
                  <style>{`
                      .ProseMirror {
                        padding: 16px !important;
                        outline: none !important;
                        direction: ltr !important;
                        unicode-bidi: normal !important;
                        text-align: left !important;
                      }
                      .ProseMirror * {
                        direction: ltr !important;
                        unicode-bidi: normal !important;
                      }
                      .rich-text-editor, .rich-text-editor-toolbar {
                        direction: ltr !important;
                      }
                      input[type="text"], textarea {
                        direction: ltr !important;
                        unicode-bidi: normal !important;
                      }
                    `}</style>
                  <RichTextEditor
                    initialValue={message || ""}
                    onChange={(newValue) => setMessage(newValue)}
                    onCreate={(_editor) => {
                      // Store editor reference if needed
                    }}
                    placeholder="Write a personalized message..."
                  />
                </div>
              </div>
            </div>

            {/* Attach Files Button */}
            <div style={{ width: "100%" }}>
              <Button
                style={{
                  backgroundColor: "#000",
                  color: "white",
                  width: "100%",
                  justifyContent: "center",
                  padding: "12px",
                }}
              >
                <Icon name="paperclip" />
                Attach files
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div
          style={{
            minWidth: 0,
            backgroundColor: "white",
            padding: "var(--spacer-4)",
            height: "100%",
            alignSelf: "stretch",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacer-3)" }}>
            {/* Preview Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>Preview</h3>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div
                  style={{
                    border: "1px solid #000",
                    borderRadius: "4px",
                    padding: "8px 16px",
                    backgroundColor: "white",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  Email
                  <Icon name="outline-cheveron-down" />
                </div>
                <div
                  style={{
                    border: "1px solid #000",
                    borderRadius: "4px",
                    padding: "8px",
                    backgroundColor: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    minWidth: "40px",
                    height: "40px",
                  }}
                >
                  <Icon name="outline-key" />
                </div>
              </div>
            </div>

            {/* Preview Content */}
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: "20px",
                backgroundColor: "#f9f9f9",
                minHeight: "300px",
              }}
            >
              <h4 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>{name || "Subject"}</h4>
              <div style={{ fontSize: "14px", lineHeight: 1.5, marginBottom: "40px" }}>
                <div dangerouslySetInnerHTML={{ __html: message || "Write a personalized message..." }} />
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  borderTop: "1px solid #ddd",
                  paddingTop: "16px",
                  textAlign: "center",
                }}
              >
                548 Market St, San Francisco, CA 94104-5401, USA
                <br />
                <div style={{ marginTop: "8px" }}>
                  Powered by <strong>gumroad</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
