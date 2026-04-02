import React from "react"

export interface SubComponentProps {
  children?: React.ReactNode
  className?: string
}

export interface SubComponentEntry {
  name: string
  component: React.FC<SubComponentProps>
  defaultClasses?: string
}

const subComponentRegistry = new Map<string, SubComponentEntry>()

export function registerSubComponent(entry: SubComponentEntry): void {
  subComponentRegistry.set(entry.name, entry)
}

export function getSubComponent(name: string): SubComponentEntry | undefined {
  return subComponentRegistry.get(name)
}

export function getAllSubComponents(): SubComponentEntry[] {
  return Array.from(subComponentRegistry.values())
}

export function withSubComponents<T extends object>(
  Component: T,
  subComponentNames: string[]
): T & Record<string, React.FC<SubComponentProps>> {
  const result = { ...Component } as Record<string, unknown>
  for (const name of subComponentNames) {
    const entry = getSubComponent(name)
    if (entry) result[name] = entry.component
  }
  return result as T & Record<string, React.FC<SubComponentProps>>
}

registerSubComponent({
  name: "icon",
  component: ({ children, className }) => React.createElement("span", { className }, children),
  defaultClasses: "",
})

registerSubComponent({
  name: "text",
  component: ({ children, className }) => React.createElement("span", { className }, children),
  defaultClasses: "",
})

registerSubComponent({
  name: "badge",
  component: ({ children, className }) =>
    React.createElement(
      "span",
      {
        className: `ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white ${className || ""}`,
      },
      children
    ),
  defaultClasses: "ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white",
})

registerSubComponent({
  name: "header",
  component: ({ children, className }) =>
    React.createElement("header", { className: `font-bold text-lg ${className || ""}` }, children),
  defaultClasses: "font-bold text-lg",
})

registerSubComponent({
  name: "body",
  component: ({ children, className }) =>
    React.createElement("div", { className: `flex-1 ${className || ""}` }, children),
  defaultClasses: "flex-1",
})

registerSubComponent({
  name: "footer",
  component: ({ children, className }) =>
    React.createElement("footer", { className: `border-t pt-4 ${className || ""}` }, children),
  defaultClasses: "border-t pt-4",
})

registerSubComponent({
  name: "content",
  component: ({ children, className }) => React.createElement("div", { className }, children),
  defaultClasses: "",
})

registerSubComponent({
  name: "title",
  component: ({ children, className }) =>
    React.createElement("div", { className: `font-semibold ${className || ""}` }, children),
  defaultClasses: "font-semibold",
})

registerSubComponent({
  name: "message",
  component: ({ children, className }) =>
    React.createElement("div", { className: `text-sm ${className || ""}` }, children),
  defaultClasses: "text-sm",
})

registerSubComponent({
  name: "close",
  component: ({ children, className }) =>
    React.createElement("span", { className: `cursor-pointer ${className || ""}` }, children),
  defaultClasses: "cursor-pointer",
})

registerSubComponent({
  name: "image",
  component: ({ className }) => React.createElement("img", { className }),
  defaultClasses: "",
})
