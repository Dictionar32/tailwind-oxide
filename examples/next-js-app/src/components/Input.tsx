import React from "react"
/**
 * Input + Textarea — tw template literal + tw(Component) extend pattern
 *
 * Contoh penggunaan:
 *   <Input label="Email" type="email" placeholder="hello@example.com" />
 *   <Input label="Password" type="password" error="Password terlalu pendek" />
 *   <Input label="Search" prefix={<SearchIcon />} />
 *   <Textarea label="Pesan" rows={4} />
 */

import { tw } from "tailwind-styled-v4"

// ── Base field wrapper ────────────────────────────────────────────────────────
const FieldRoot = tw.div`flex flex-col gap-1.5`
const Label = tw.label`text-sm font-medium text-gray-700`
const HintText = tw.p`text-xs text-gray-400`
const ErrorText = tw.p`text-xs text-red-600`

// ── Base input ────────────────────────────────────────────────────────────────
const InputBase = tw.input`
  w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
  text-gray-900 placeholder:text-gray-400
  focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200
  disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400
  transition
`

// ── tw(Component) extend — input with error state ─────────────────────────────
const InputError = tw(InputBase)`
  border-red-400 focus:border-red-500 focus:ring-red-200
`

// ── Textarea extends InputBase ─────────────────────────────────────────────────
const TextareaBase = tw.textarea`
  w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
  text-gray-900 placeholder:text-gray-400 resize-y min-h-[80px]
  focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200
  disabled:cursor-not-allowed disabled:bg-gray-50
  transition
`

const InputWrapper = tw.div`relative flex items-center`
const PrefixSlot = tw.span`absolute left-3 text-gray-400`
const SuffixSlot = tw.span`absolute right-3 text-gray-400`

// ── Input Props ───────────────────────────────────────────────────────────────
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string
  hint?: string
  error?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

export function Input({ label, hint, error, prefix, suffix, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")
  const InputComponent = error ? InputError : InputBase

  return (
    <FieldRoot>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <InputWrapper>
        {prefix && <PrefixSlot>{prefix}</PrefixSlot>}
        <InputComponent
          id={inputId}
          className={prefix ? "pl-9" : suffix ? "pr-9" : className}
          aria-invalid={!!error}
          {...props}
        />
        {suffix && <SuffixSlot>{suffix}</SuffixSlot>}
      </InputWrapper>
      {error ? <ErrorText>{error}</ErrorText> : hint ? <HintText>{hint}</HintText> : null}
    </FieldRoot>
  )
}

// ── Textarea Props ─────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, id, className, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")
  return (
    <FieldRoot>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <TextareaBase
        id={inputId}
        className={className}
        aria-invalid={!!error}
        {...props}
      />
      {error ? <ErrorText>{error}</ErrorText> : hint ? <HintText>{hint}</HintText> : null}
    </FieldRoot>
  )
}
