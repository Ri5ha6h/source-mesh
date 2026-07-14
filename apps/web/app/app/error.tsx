'use client';

import { Button } from '@source-mesh/ui';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="workspace-page">
      <p className="eyebrow">Context unavailable</p>
      <h1>The application context could not be loaded.</h1>
      <p className="lede">
        No authority was changed. Retry the request, or sign in again if access expired.
      </p>
      <Button onClick={reset}>Retry context</Button>
    </section>
  );
}
