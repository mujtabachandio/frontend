import Link from "next/link";
import { AIAssistantInterface } from "@/components/ui/ai-assistant-interface";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      {/* <div className="pointer-events-none absolute right-0 top-0 z-10 flex gap-3 p-4 text-sm">
        <Link
          href="/admin"
          className="pointer-events-auto rounded-full bg-white/90 px-3 py-1.5 text-slate-600 shadow ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Manage policies
        </Link>
      </div> */}
      <AIAssistantInterface />
    </div>
  );
}
