"use client";

import React from "react";

export interface TestResult {
  name: string;
  passed: boolean;
  result?: string;
  error?: string;
}

export interface PackageTestResult {
  name: string;
  importPath: string;
  category: string;
  status: "pass" | "fail" | "skipped";
  tests: TestResult[];
  skipReason?: string;
  importError?: string;
  durationMs?: number;
  exportCount?: number;
}

function StatusBadge({ status }: { status: "pass" | "fail" | "skipped" }) {
  const colors: Record<string, string> = {
    pass: "bg-green-100 text-green-800 border-green-300",
    fail: "bg-red-100 text-red-800 border-red-300",
    skipped: "bg-gray-100 text-gray-600 border-gray-300",
  };
  const labels: Record<string, string> = {
    pass: "PASS",
    fail: "FAIL",
    skipped: "SKIPPED",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${colors[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function PackageCard({ result }: { result: PackageTestResult }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <StatusBadge status={result.status} />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {result.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>{result.importPath}</span>
              {typeof result.exportCount === "number" && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                  {result.exportCount} exports
                </span>
              )}
              {typeof result.durationMs === "number" && (
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                  {result.durationMs} ms
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
          {result.category}
        </span>
      </div>

      {result.skipReason && (
        <div className="px-4 py-3 text-sm text-gray-500 italic">
          {result.skipReason}
        </div>
      )}

      {result.importError && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
          Import error: {result.importError}
        </div>
      )}

      {result.tests.length > 0 && (
        <div className="divide-y divide-gray-100">
          {result.tests.map((test, i) => (
            <div key={i} className="px-4 py-2 flex items-start gap-2 text-sm">
              <span
                className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  test.passed
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {test.passed ? "OK" : "X"}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-gray-700 font-medium">{test.name}</span>
                {test.result && (
                  <span className="ml-2 text-xs text-gray-400 font-mono truncate block">
                    {test.result}
                  </span>
                )}
                {test.error && (
                  <span className="ml-2 text-xs text-red-500 truncate block">
                    {test.error}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CategorySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">
        {title}
      </h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

export function SummaryBar({ results }: { results: PackageTestResult[] }) {
  const pass = results.filter((r) => r.status === "pass").length;
  const fail = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const total = results.length;

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="font-bold text-gray-900">
        {total} packages tested
      </span>
      <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">
        {pass} PASS
      </span>
      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold">
        {fail} FAIL
      </span>
      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">
        {skipped} SKIPPED
      </span>
    </div>
  );
}
