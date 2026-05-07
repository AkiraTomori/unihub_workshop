import { useEffect, useMemo, useState } from "react";
import { Spinner, Badge } from "./ui";
import { api } from "../services/api";

function normalizeDocument(document) {
  if (!document) return null;
  return {
    id: document.id || "",
    workshopId: document.workshopId || document.workshop_id || "",
    pdfUrl: document.pdfUrl || document.pdf_url || "",
    aiSummary: document.aiSummary || document.ai_summary || "",
    processStatus: document.processStatus || document.process_status || document.documentStatus || "PENDING",
    createdAt: document.createdAt || document.created_at || "",
    updatedAt: document.updatedAt || document.updated_at || ""
  };
}

export default function DocumentManager({ token, workshops, onToast }) {
  const [selectedWorkshopId, setSelectedWorkshopId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [documents, setDocuments] = useState({});
  const [loadingDocs, setLoadingDocs] = useState({});
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const currentDoc = useMemo(
    () => normalizeDocument(documents[selectedWorkshopId]),
    [documents, selectedWorkshopId]
  );

  useEffect(() => {
    if (!selectedWorkshopId) return;

    let mounted = true;

    const loadDoc = async () => {
      try {
        setLoadingDocs((prev) => ({ ...prev, [selectedWorkshopId]: true }));
        const document = await api.getDocument(token, selectedWorkshopId);
        if (!mounted) return;
        setDocuments((prev) => ({ ...prev, [selectedWorkshopId]: normalizeDocument(document) }));
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load document:", error);
      } finally {
        if (mounted) {
          setLoadingDocs((prev) => ({ ...prev, [selectedWorkshopId]: false }));
        }
      }
    };

    loadDoc();
    return () => {
      mounted = false;
    };
  }, [selectedWorkshopId, token]);

  async function refreshDocument(workshopId) {
    const document = await api.getDocument(token, workshopId);
    setDocuments((prev) => ({ ...prev, [workshopId]: normalizeDocument(document) }));
  }

  async function handleUpload() {
    if (!selectedWorkshopId || !selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      onToast?.("Only PDF files are allowed", "error");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      onToast?.("File size must be less than 50MB", "error");
      return;
    }

    if (currentDoc?.pdfUrl) {
      const shouldOverwrite = window.confirm("Overwrite");
      if (!shouldOverwrite) return;
    }

    try {
      setUploading(true);
      await api.uploadDocument(token, selectedWorkshopId, selectedFile);
      await refreshDocument(selectedWorkshopId);
      onToast?.("PDF uploaded successfully.", "success");
      setSelectedFile(null);
    } catch (error) {
      onToast?.(error.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleStartSummary() {
    if (!selectedWorkshopId) return;

    try {
      setSummarizing(true);
      await api.startDocumentSummary(token, selectedWorkshopId);
      await refreshDocument(selectedWorkshopId);
      onToast?.("AI Summary started.", "info");
    } catch (error) {
      onToast?.(error.message || "Failed to start summary", "error");
    } finally {
      setSummarizing(false);
    }
  }

  const isLoadingCurrentDoc = loadingDocs[selectedWorkshopId];
  const statusColors = {
    PENDING: "yellow",
    PROCESSING: "blue",
    COMPLETED: "green",
    FAILED: "red"
  };

  const currentStatus = currentDoc?.processStatus || "PENDING";
  const selectedWorkshop = workshops.find((workshop) => workshop.id === selectedWorkshopId);

  return (
    <div className="space-y-4 rounded-lg border border-blue-200 bg-white p-4">
      <h3 className="text-lg font-semibold text-blue-950">Workshop Documents</h3>

      <div>
        <label className="mb-2 block text-sm font-medium text-blue-900">Select Workshop</label>
        <select
          value={selectedWorkshopId}
          onChange={(e) => {
            setSelectedWorkshopId(e.target.value);
            setSelectedFile(null);
          }}
          className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
        >
          <option value="">-- Choose a workshop --</option>
          {workshops.map((workshop) => (
            <option key={workshop.id} value={workshop.id}>
              {workshop.title}
            </option>
          ))}
        </select>
      </div>

      {selectedWorkshopId ? (
        <>
          <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3 text-sm text-blue-900">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">Selected workshop</span>
              {selectedWorkshop?.status ? <Badge tone="blue">{selectedWorkshop.status}</Badge> : null}
            </div>
            <p>{selectedWorkshop?.title || "Unknown workshop"}</p>
            <div className="text-xs text-blue-700">
              <span className="block mb-1">Document path:</span>
              {currentDoc?.pdfUrl ? (
                <a
                  href={currentDoc.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-blue-600 font-semibold hover:text-blue-800 hover:underline break-all"
                >
                  {currentDoc.pdfUrl}
                </a>
              ) : (
                <span className="text-blue-700">No file uploaded yet</span>
              )}
            </div>
          </div>

          <div className="space-y-3 border-t border-blue-200 pt-4">
            <h4 className="font-medium text-blue-900">Upload PDF</h4>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="file"
                accept=".pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                disabled={uploading || summarizing}
                className="flex-1 text-sm"
              />
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploading || summarizing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:bg-blue-300"
              >
                {uploading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Uploading...
                  </>
                ) : (
                  "Upload PDF"
                )}
              </button>
            </div>
            {selectedFile ? <p className="text-xs text-blue-700">Selected file: {selectedFile.name}</p> : null}
          </div>

          <div className="space-y-3 border-t border-blue-200 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-medium text-blue-900">AI Summary</h4>
              <Badge tone={statusColors[currentStatus] || "yellow"}>{currentStatus}</Badge>
            </div>

            <button
              type="button"
              onClick={handleStartSummary}
              disabled={!currentDoc?.pdfUrl || summarizing || uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50"
            >
              {summarizing ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Starting summary...
                </>
              ) : (
                "AI Summary"
              )}
            </button>

            {isLoadingCurrentDoc ? (
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Spinner className="h-4 w-4" />
                Loading document...
              </div>
            ) : currentDoc ? (
              <div className="space-y-3">
                {currentDoc.pdfUrl ? (
                  <a
                    href={currentDoc.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex text-sm font-medium text-blue-600 hover:underline"
                  >
                    Open file path
                  </a>
                ) : null}

                <p className="text-sm text-blue-800">
                  {currentStatus === "PROCESSING"
                    ? "AI summary is processing now."
                    : currentStatus === "COMPLETED"
                      ? "AI summary completed."
                      : currentStatus === "FAILED"
                        ? "AI summary failed."
                        : "Upload the PDF first, then click AI Summary."}
                </p>

                {currentDoc.aiSummary && currentStatus === "COMPLETED" ? (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-blue-900">Summary</h5>
                    <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{currentDoc.aiSummary}</p>
                  </div>
                ) : null}

                {currentDoc.createdAt ? (
                  <p className="text-xs text-blue-600">Uploaded: {new Date(currentDoc.createdAt).toLocaleString()}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-blue-700">No document uploaded yet</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}