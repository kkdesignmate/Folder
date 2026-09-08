import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { useEffect } from 'react'

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: BtnProps) {
  const sizes = {
    sm: 'px-3 py-1.5 text-[13px] rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-5 py-3.5 text-[15px] rounded-2xl',
  }[size]
  const variants = {
    primary: 'bg-[var(--accent)] text-[var(--on-accent)] font-semibold active:opacity-80',
    ghost: 'text-[var(--muted)] active:text-[var(--text)]',
    outline: 'border border-[var(--line)] text-[var(--text)] active:bg-[var(--surface-2)]',
    danger: 'bg-[var(--danger)] text-white font-semibold active:opacity-80',
  }[variant]
  return <button className={`${sizes} ${variants} transition disabled:opacity-40 ${className}`} {...rest} />
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-7 mb-2.5 flex items-end justify-between px-1">
      <h2 className="text-[13px] font-semibold tracking-wide text-[var(--muted)] uppercase">{children}</h2>
      {action}
    </div>
  )
}

export function Progress({ pct, className = '' }: { pct: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)] ${className}`}>
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 animate-fade" onClick={onClose} />
      <div className="animate-rise relative max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--line)] bg-[var(--surface)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-3xl">
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">{title}</h3>
            <button onClick={onClose} className="text-xl leading-none text-[var(--muted)]" aria-label="ปิด">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-[var(--muted)]">{hint}</span>}
    </label>
  )
}

const inputBase =
  'w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]/60 focus:border-[var(--accent)]'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} resize-none leading-relaxed ${props.className ?? ''}`} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} appearance-none ${props.className ?? ''}`} />
}

export function Chip({
  active,
  children,
  ...rest
}: { active?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
          : 'border-[var(--line)] text-[var(--muted)]'
      } ${rest.className ?? ''}`}
    >
      {children}
    </button>
  )
}

export function Empty({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mb-3 text-3xl opacity-60">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {body && <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">{body}</p>}
    </div>
  )
}
