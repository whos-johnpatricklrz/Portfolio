import { ArrowLeft } from '@/components/slab'
import { useNavigate } from 'react-router-dom'
import { profile } from '@/data/profile'

/**
 * Privacy Policy - PLACEHOLDER. Legal text has to describe YOUR site and what
 * it collects, so none is supplied. Write it (or have a lawyer or a policy
 * generator write it) and paste it into the sections below.
 */
export default function Privacy() {
  const navigate = useNavigate()

  return (
    <main className="legal-page" aria-label="Privacy Policy">
      <div className="legal-page__card">
        <button
          className="legal-page__back"
          onClick={() => navigate('/')}
          aria-label="Back to home"
        >
          <ArrowLeft weight="bold" size={15} aria-hidden="true" />
          Back to home
        </button>

        <h1 className="legal-page__title">Privacy Policy</h1>
        <p className="legal-page__updated">Last updated: PLACEHOLDER date</p>

        <div className="legal-page__body">
          <h2>Who this covers</h2>
          <p>PLACEHOLDER - tell me what to put here: who runs this site and which sites this policy applies to.</p>

          <h2>What is collected</h2>
          <p>PLACEHOLDER - tell me what to put here: what the contact form and any analytics collect.</p>

          <h2>How it is used</h2>
          <p>PLACEHOLDER - tell me what to put here: what you do with that data and who else sees it.</p>

          <h2>How long it is kept</h2>
          <p>PLACEHOLDER - tell me what to put here: retention periods and how to ask for deletion.</p>

          <h2>Contact</h2>
          <p>
            Questions about this policy: <a href={`mailto:${profile.email}`}>{profile.email}</a>
          </p>
        </div>
      </div>
    </main>
  )
}
