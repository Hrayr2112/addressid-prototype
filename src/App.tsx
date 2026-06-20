import { useState } from 'react'
import { UserApp } from './UserApp'
import { OrgApp } from './PartnerApp'
import { BRAND_NAME } from './store'

type Stage = 'intro' | 'user' | 'organization'

export function App() {
  const [stage, setStage] = useState<Stage>('intro')

  if (stage === 'user') return <UserApp onSignOut={() => setStage('intro')} />
  if (stage === 'organization')
    return <OrgApp onSignOut={() => setStage('intro')} />

  return (
    <div className="intro">
      <div className="intro-wrap pop-in">
        <span className="brand-pill">
          <img src="./pin.svg" width={18} height={18} alt="" /> {BRAND_NAME}
        </span>
        <h1 className="intro-title">A demonstration of {BRAND_NAME}</h1>
        <p className="intro-text">
          This is a demonstration version created to visually show interested
          parties how the user-facing part of the platform may look.
        </p>
        <p className="intro-text">
          This demo is intended only to demonstrate the practical use of the
          solution and the general user flow. For confidentiality reasons,
          sensitive technical and patent-related details are not shown here,
          including methods of reliable address verification and mechanisms that
          help protect address information from unauthorized use.
        </p>
        <p className="intro-text strong">
          You can continue in one of two demonstration modes:
        </p>

        <div className="mode-panels">
          <button
            className="mode-panel user"
            onClick={() => setStage('user')}
          >
            <span className="mode-icon">👤</span>
            <span className="mode-title">User account</span>
            <span className="mode-desc">
              To see how an individual manages addresses and access permissions.
            </span>
            <span className="mode-cta">Enter as user →</span>
          </button>

          <button
            className="mode-panel org"
            onClick={() => setStage('organization')}
          >
            <span className="mode-icon">🏢</span>
            <span className="mode-title">Organization account</span>
            <span className="mode-desc">
              To see how an organization requests and uses approved access to
              address information.
            </span>
            <span className="mode-cta">Enter as organization →</span>
          </button>
        </div>
      </div>
    </div>
  )
}
