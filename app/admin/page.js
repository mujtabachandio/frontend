"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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
      const response = await fetch(`${API_BASE_URL}/api/v1/policies`, {
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

  async function handleLogin() {
    if (!token) return;
    sessionStorage.setItem("adminToken", token);
    setIsAuthed(true);
    setStatus("");
    await fetchPolicies(token);
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
      const response = await fetch(`${API_BASE_URL}/api/v1/upload-policy`, {
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
      const response = await fetch(`${API_BASE_URL}/api/v1/delete-policy`, {
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
          <h1 className="text-xl font-semibold">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter the admin token to manage policy documents.
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
            Admin Dashboard
          </p>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Manage Policies</h1>
            <Link
              href="/"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Back to chat
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Upload Policy</h2>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="w-full text-sm"
            />
            <input
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="current">Current</option>
              <option value="archived">Archived</option>
            </select>
            <button
              onClick={handleUpload}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Upload
            </button>
          </div>
          {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
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
