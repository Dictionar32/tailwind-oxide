"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  CategorySection,
  PackageCard,
  SummaryBar,
  type PackageTestResult,
} from "@/components/packages/PackageCard";

interface PackageTestsResponse {
  generatedAt: string;
  results: PackageTestResult[];
}

const categories = [
  "Runtime",
  "Utilities",
  "Build Tools",
  "Bundler Adapters",
  "Plugin System",
  "Framework Adapters",
  "Observability",
  "Skipped",
] as const;

export default function PackagesTestPage() {
  const [results, setResults] = useState<PackageTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const runAllTests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/package-tests", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as PackageTestsResponse;
      setResults(payload.results);
      setGeneratedAt(payload.generatedAt);
    } catch (e: unknown) {
      setResults([]);
      setGeneratedAt(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runAllTests();
  }, [runAllTests]);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Package Test Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Menjalankan verifikasi 28 package dari monorepo tailwind-styled-v4
            lewat endpoint server, lalu menampilkan hasilnya di dashboard
            client. Paket Node-only sekarang tetap ikut dites tanpa memaksa
            bundle browser memuat dependensi server.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-700">
            Server-executed package checks
          </span>
          {generatedAt && (
            <span className="rounded bg-gray-100 px-2 py-1">
              Last run: {new Date(generatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <p className="mt-4 text-gray-600">Running server package tests...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal mengambil hasil package tests: {error}
        </div>
      ) : (
        <>
          <SummaryBar results={results} />

          {categories.map((category) => {
            const categoryResults = results.filter((result) => result.category === category);
            if (categoryResults.length === 0) return null;

            return (
              <CategorySection key={category} title={category}>
                {categoryResults.map((result) => (
                  <PackageCard key={result.name} result={result} />
                ))}
              </CategorySection>
            );
          })}
        </>
      )}

      <div className="text-center pt-8 border-t border-gray-200">
        <button
          onClick={runAllTests}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium text-sm"
        >
          {loading ? "Running..." : "Re-run Server Tests"}
        </button>
      </div>
    </div>
  );
}
