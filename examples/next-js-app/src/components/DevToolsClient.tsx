"use client"

import dynamic from "next/dynamic"

// TwDevTools menggunakan hooks — wajib client component
// dynamic import dengan ssr:false supaya tidak render di server
const TwDevToolsDynamic = dynamic(
  () => import("tailwind-styled-v4/devtools").then((m) => ({ default: m.TwDevTools })),
  { ssr: false }
)

export function DevToolsClient() {
  return <TwDevToolsDynamic />
}
