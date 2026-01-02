"use client";

import { useState, useRef } from "react";

interface CompanyResult {
  businessName: string;
  originalUrl: string;
  newUrl: string;
  status: "found" | "kept" | "error";
}

export default function AgentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [downloadReady, setDownloadReady] = useState(false);
  const [csvContent, setCsvContent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith(".csv")) {
      setFile(selectedFile);
      setResults([]);
      setDownloadReady(false);
    }
  };

  const processCSV = async () => {
    if (!file) return;

    setProcessing(true);
    setResults([]);
    setDownloadReady(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/find-websites", {
        method: "POST",
        body: formData,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);

            if (data.type === "progress") {
              setProgress({ current: data.current, total: data.total });
            } else if (data.type === "result") {
              setResults(prev => [...prev, data.result]);
            } else if (data.type === "complete") {
              setCsvContent(data.csv);
              setDownloadReady(true);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (error) {
      console.error("Error processing CSV:", error);
    } finally {
      setProcessing(false);
    }
  };

  const downloadCSV = () => {
    if (!csvContent) return;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Cold Call List - With-Websites.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const foundCount = results.filter(r => r.status === "found").length;
  const keptCount = results.filter(r => r.status === "kept").length;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Website Finder Agent</h1>
        <p className="text-gray-400 mb-8">
          Upload a CSV with business names and BBB profile links. The agent will search for actual company websites.
        </p>

        {/* File Upload */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">1. Upload CSV</h2>
          <p className="text-sm text-gray-400 mb-4">
            Expected format: Column B = BBB URL, Column C = Business Name
          </p>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition"
            >
              Choose File
            </button>
            {file && (
              <span className="text-gray-300">{file.name}</span>
            )}
          </div>
        </div>

        {/* Process Button */}
        {file && !processing && !downloadReady && (
          <button
            onClick={processCSV}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl mb-6 transition"
          >
            Find Websites
          </button>
        )}

        {/* Progress */}
        {processing && (
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Processing...</h2>
            <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
              <div
                className="bg-orange-500 h-3 rounded-full transition-all duration-300"
                style={{ width: progress.total ? `${(progress.current / progress.total) * 100}%` : "0%" }}
              />
            </div>
            <p className="text-sm text-gray-400">
              {progress.current} / {progress.total} companies processed
            </p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Results</h2>
              <div className="flex gap-4 text-sm">
                <span className="text-green-400">{foundCount} websites found</span>
                <span className="text-gray-400">{keptCount} kept BBB</span>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {results.map((result, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    result.status === "found" ? "bg-green-900/30" : "bg-gray-800"
                  }`}
                >
                  <div className="font-medium truncate">{result.businessName}</div>
                  <div className="text-sm text-gray-400 truncate">
                    {result.status === "found" ? (
                      <span className="text-green-400">{result.newUrl}</span>
                    ) : (
                      <span>(kept BBB link)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download */}
        {downloadReady && (
          <button
            onClick={downloadCSV}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition"
          >
            Download Updated CSV
          </button>
        )}
      </div>
    </div>
  );
}
