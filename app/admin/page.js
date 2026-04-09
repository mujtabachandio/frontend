"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [version, setVersion] = useState("current");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const savedToken = sessionStorage.getItem("adminToken");
    if (savedToken) {
      setToken(savedToken);
      setIsAuthed(true);
    }
  }, []);

  async function fetchPolicies(authToken) {
    try {
      const response = await fetch("/api/v1/policies", {
        headers: { "X-Admin-Token": authToken },
      });
      if (!response.ok) {
        throw new Error("Failed to load policies.");
      }
      const data = await response.json();
      setPolicies(data || []);
    } catch (err) {
      setStatus("Unable to fetch policies.");
    }
  }

  function handleLogin() {
    if (!token) return;
    sessionStorage.setItem("adminToken", token);
    setIsAuthed(true);
    setStatus("");
  }

  function handleSignOut() {
    sessionStorage.removeItem("adminToken");
    setToken("");
    setIsAuthed(false);
    setPolicies([]);
    setStatus("");
    setFile(null);
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("Uploading...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("version", version);
      if (effectiveDate) {
        formData.append("effective_date", effectiveDate);
      }
      const response = await fetch("/api/v1/upload-policy", {
        method: "POST",
        headers: { "X-Admin-Token": token },
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Upload failed.");
      }
      setStatus("Upload complete.");
      setFile(null);
      setEffectiveDate("");
      await fetchPolicies(token);
    } catch (err) {
      setStatus("Upload failed.");
    }
  }

  async function handleDelete(fileName) {
    setStatus("Deleting...");
    try {
      const response = await fetch("/api/v1/delete-policy", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token,
        },
        body: JSON.stringify({ file_name: fileName }),
      });
      if (!response.ok) {
        throw new Error("Delete failed.");
      }
      setStatus("Policy deleted.");
      await fetchPolicies(token);
    } catch (err) {
      setStatus("Delete failed.");
    }
  }

  useEffect(() => {
    if (isAuthed && token) {
      fetchPolicies(token);
    }
  }, [isAuthed, token]);

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Policy admin</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter the admin token (same as <code className="text-xs">ADMIN_TOKEN</code> on the
            server) to upload or remove policy PDFs. The public chat does not require login.
          </p>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Admin token"
            className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleLogin}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Policy admin
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">Manage Policies</h1>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Sign out
              </button>
              <Link
                href="/"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Back to chat
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Upload Policy</h2>
          <p className="mt-1 text-sm text-slate-500">
            PDF only. Set an optional effective date and version before uploading.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-600">PDF file</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
              {file && (
                <p className="text-xs text-slate-600">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                Effective date (optional)
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(event) => setEffectiveDate(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Version</label>
              <select
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="current">Current</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Upload
            </button>
          </div>
          {status && (
            <p className="mt-3 text-sm text-slate-600" role="status">
              {status}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Active Documents</h2>
          <div className="mt-4 flex flex-col gap-3">
            {policies.length === 0 && (
              <p className="text-sm text-slate-500">
                No policies found in Qdrant.
              </p>
            )}
            {policies.map((policy) => (
              <div
                key={policy.file_name}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">{policy.file_name}</p>
                  <p className="text-xs text-slate-500">
                    Version: {policy.version}
                  </p>
                  {policy.effective_date && (
                    <p className="text-xs text-slate-500">
                      Effective: {policy.effective_date}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(policy.file_name)}
                  className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
