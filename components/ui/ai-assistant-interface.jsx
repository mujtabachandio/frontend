"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUp, Mic } from "lucide-react";

import { DotLoader } from "@/components/dot-loader";

// Same-origin /api/v1 — Next rewrites proxy to BACKEND_URL (avoids browser CORS to Render).

const SEND_DOT_FRAMES = [
  [0, 2, 4, 6, 20, 34, 48, 46, 44, 42, 28, 14, 8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
    [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47],
    [8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
    [9, 11, 15, 17, 19, 23, 25, 29, 31, 33, 37, 39],
    [16, 30, 24, 18, 32],
    [17, 23, 31, 25],
    [24],
    [17, 23, 31, 25],
    [16, 30, 24, 18, 32],
    [9, 11, 15, 17, 19, 23, 25, 29, 31, 33, 37, 39],
    [8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
    [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47],
    [0, 2, 4, 6, 20, 34, 48, 46, 44, 42, 28, 14, 8, 22, 36, 38, 40, 26, 12, 10, 16, 30, 24, 18, 32],
];

export function AIAssistantInterface() {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const abortControllerRef = useRef(null);


  useEffect(() => {
    const storedMessages = sessionStorage.getItem("iba_chat_messages");
    const storedStarted = sessionStorage.getItem("iba_chat_started");
    const storedSessionId = sessionStorage.getItem("iba_chat_session_id");
    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } catch {
        // ignore malformed data
      }
    }
    if (storedStarted === "true") {
      setHasStarted(true);
    }
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("iba_chat_messages", JSON.stringify(messages));
    sessionStorage.setItem("iba_chat_started", hasStarted ? "true" : "false");
  }, [messages, hasStarted]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  function ensureSessionId() {
    let storedSessionId = sessionStorage.getItem("iba_chat_session_id");
    if (!storedSessionId) {
      storedSessionId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem("iba_chat_session_id", storedSessionId);
    }
    if (storedSessionId !== sessionId) {
      setSessionId(storedSessionId);
    }
    return storedSessionId;
  }

  function playAudio(base64) {
    if (!base64) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    audioRef.current = audio;
    audio.play().catch(() => {});
  }

  function stopResponse() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsLoading(false);
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (
        last.role === "assistant" &&
        (!last.content || last.content.trim() === "") &&
        (!last.sources || last.sources.length === 0)
      ) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }

  async function clearChat() {
    stopResponse();
    setMessages([]);
    setHasStarted(false);
    sessionStorage.removeItem("iba_chat_messages");
    sessionStorage.removeItem("iba_chat_started");
    const activeSessionId = ensureSessionId();
    try {
      await fetch("/api/v1/reset", {
        method: "POST",
        headers: { "X-Session-Id": activeSessionId },
      });
    } catch {
      // ignore reset errors
    }
  }

  function createMessageId() {
    return typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function appendAssistantChunk(messageId, chunk) {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, content: `${message.content || ""}${chunk}` }
          : message
      )
    );
  }


  async function sendText() {
    const text = inputValue.trim();
    if (!text) return;
    setError("");
    setInputValue("");
    setHasStarted(true);
    stopResponse();
    setMessages((prev) => [
      ...prev,
      { id: createMessageId(), role: "user", content: text },
    ]);
    setHasStarted(true);
    setIsLoading(true);
    try {
      const activeSessionId = ensureSessionId();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const assistantId = createMessageId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", sources: [] },
      ]);

      const response = await fetch("/api/v1/ask-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": activeSessionId,
        },
        signal: controller.signal,
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        throw new Error("Request failed.");
      }
      if (!response.body) {
        throw new Error("No response body.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part
            .split("\n")
            .find((item) => item.startsWith("data:"));
          if (!line) continue;
          const payload = JSON.parse(line.replace("data: ", ""));
          if (payload.type === "chunk") {
            appendAssistantChunk(assistantId, payload.text || "");
          } else if (payload.type === "done") {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, sources: payload.sources || [] }
                  : message
              )
            );
            setIsLoading(false);
            abortControllerRef.current = null;
          } else if (payload.type === "audio") {
            playAudio(payload.audio_base64);
          } else if (payload.type === "audio_error") {
            // ignore audio errors to keep text responsive
          } else if (payload.type === "error") {
            throw new Error(payload.message || "Stream error.");
          }
        }
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        setError("Could not fetch a response. Try again.");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }

  async function sendAudio(blob) {
    if (!blob) return;
    setError("");
    setIsLoading(true);
    stopResponse();
    const audioMessageId = createMessageId();
    setMessages((prev) => [
      ...prev,
      { id: audioMessageId, role: "user", content: "🎤 Voice message" },
    ]);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const activeSessionId = ensureSessionId();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const response = await fetch("/api/v1/ask", {
        method: "POST",
        headers: { "X-Session-Id": activeSessionId },
        signal: controller.signal,
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Request failed.");
      }
      const data = await response.json();
      if (typeof data.transcript === "string") {
        const transcript = data.transcript.trim();
        setMessages((prev) =>
          prev.map((message) =>
            message.id === audioMessageId
              ? {
                  ...message,
                  content:
                    transcript || "Voice message (couldn't transcribe clearly)",
                }
              : message
          )
        );
      }
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content: data.answer || "",
          sources: data.sources || [],
        },
      ]);
      playAudio(data.audio_base64);
    } catch (err) {
      if (err?.name !== "AbortError") {
        setError("Could not process the audio. Try again.");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }

  async function startRecording() {
    if (isRecording) return;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        sendAudio(blob);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        streamRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access was denied.");
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }

  async function handleSendMessage(event) {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    if (!inputValue.trim() || isLoading) return;
    await sendText();
  }

  const isLanding = !hasStarted && messages.length === 0;
  const inputForm = (
    <form
      onSubmit={handleSendMessage}
      className="w-full rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="px-4 py-3">
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask a question about HR policies..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>Voice answers play automatically after a response.</span>
          <button
            type="button"
            onClick={clearChat}
            className="text-[11px] text-slate-500 hover:text-slate-700 underline"
          >
            Clear
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <button
              type="button"
              onClick={stopResponse}
              className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-1.5 rounded-full transition-colors ${
              isRecording
                ? "bg-red-50 text-red-600"
                : "bg-slate-100 text-slate-500 hover:text-slate-700"
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isLoading
                ? "bg-black text-white cursor-wait"
                : inputValue.trim()
                ? "bg-[#7A1F1D] text-white hover:bg-[#641817]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <span className="inline-flex h-4 w-4 items-center justify-center overflow-hidden">
                <DotLoader
                  frames={SEND_DOT_FRAMES}
                  duration={140}
                  repeatCount={-1}
                  className="gap-0.5 scale-[0.35] origin-center"
                  dotClassName="h-1 w-1 rounded-full bg-black/40 [&.active]:bg-[#C9A227]"
                />
              </span>
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
            )}
            Send
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-5 pt-8 pb-24">
        <div className="flex justify-center">
          <Image
            src="/iba_new_logo.png"
            alt="IBA logo"
            width={160}
            height={50}
            priority
            className="h-auto w-[120px] md:w-[160px]"
          />
        </div>

        {isLanding ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                How can I help today?
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Ask about HR policies, benefits, or important dates.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pt-6">
            <div className="flex flex-col gap-2 pb-6">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[78%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    message.role === "user"
                      ? "self-end bg-[#7A1F1D] text-white"
                      : "self-start bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.sources?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.sources.map((source, sourceIndex) => (
                        <span
                          key={`${source.file_name}-${sourceIndex}`}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                        >
                          {source.file_name}
                          {source.effective_date
                            ? ` • ${source.effective_date}`
                            : ""}
                          {source.page ? ` • p.${source.page}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="self-start text-[11px] text-slate-400">
                  Generating response…
                </div>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto w-full max-w-4xl px-5 py-3">
          {inputForm}
        </div>
      </div>
    </div>
  );
}
