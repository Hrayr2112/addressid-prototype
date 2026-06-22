import { useState } from 'react'
import { BRAND_NAME } from './store'

interface Slide {
  icon: string
  accent: string
  accentSoft: string
  title: string
  text: string
}

const SLIDES: Slide[] = [
  {
    icon: '📍',
    accent: '#6366f1',
    accentSoft: '#eef0fe',
    title: 'Your address, finally under your control',
    text: `${BRAND_NAME} turns your physical address into a permission you grant — not a text field you retype and lose track of on every website and form.`,
  },
  {
    icon: '👤',
    accent: '#4f46e5',
    accentSoft: '#eef0fe',
    title: 'For people',
    text: 'Add your addresses once and decide exactly who can use them — physical, mailing, or both. Switch or revoke access anytime, and everyone you’ve shared with instantly sees the current address.',
  },
  {
    icon: '🏢',
    accent: '#0f9d6b',
    accentSoft: '#e6f7f1',
    title: 'For organizations',
    text: 'Request access by a person’s User ID and receive only what they approve. The address you see is always current and verified — never stale — and you’re notified the moment it changes.',
  },
  {
    icon: '🔒',
    accent: '#d97706',
    accentSoft: '#fdf3e3',
    title: 'Private & secure by design',
    text: 'You only ever share what you approve. Address verification and protection happen behind the scenes, so your information is never exposed or used without permission.',
  },
]

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const slide = SLIDES[i]
  const last = i === SLIDES.length - 1

  return (
    <div className="intro">
      <div className="onb-card pop-in">
        <div className="onb-top">
          <span className="brand-pill">
            <img src="./pin.svg" width={18} height={18} alt="" /> {BRAND_NAME}
          </span>
          {!last && (
            <button className="link-btn" onClick={onDone}>
              Skip
            </button>
          )}
        </div>

        <div className="onb-body" key={i}>
          <div
            className="onb-icon"
            style={{ background: slide.accentSoft, color: slide.accent }}
          >
            {slide.icon}
          </div>
          <h1 className="onb-title">{slide.title}</h1>
          <p className="onb-text">{slide.text}</p>
        </div>

        <div className="onb-dots">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              className={`onb-dot ${idx === i ? 'on' : ''}`}
              onClick={() => setI(idx)}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>

        <div className="onb-actions">
          <button
            className="btn ghost"
            style={{ visibility: i === 0 ? 'hidden' : 'visible' }}
            onClick={() => setI((v) => Math.max(0, v - 1))}
          >
            Back
          </button>
          <button
            className="btn primary"
            onClick={() => (last ? onDone() : setI((v) => v + 1))}
          >
            {last ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
