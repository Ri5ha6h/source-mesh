import Link from 'next/link';
import { Button, SourceMeshBrand } from '@source-mesh/ui';

const stages = [
  ['01 · INGRESS', 'Reference submitted', 'Synthetic input accepted'],
  ['02 · SOURCE', 'Evidence captured', 'Dummy provider response retained'],
  ['03 · CORE', 'Data normalized', 'Canonical contract validated'],
  ['04 · TENANT', 'Output mapped', 'Human-reviewed tenant shape'],
  ['05 · EGRESS', 'Record delivered', 'Receipt and retry history'],
] as const;

export default function HomePage() {
  return (
    <main id="main">
      <header className="site-nav shell">
        <Link className="brand" href="#main">
          <SourceMeshBrand />
        </Link>
        <nav aria-label="Main navigation">
          <a href="#lineage">Lineage</a>
          <a href="#control">Control</a>
        </nav>
        <Button asChild variant="ghost">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>
      <section className="hero shell">
        <p className="eyebrow">Managed data operations</p>
        <h1>From reference to result, nothing disappears.</h1>
        <p className="hero-copy">
          Every capture, decision, and handoff stays visible—without mixing one customer’s context
          with another.
        </p>
        <div className="hero-actions">
          <Button asChild>
            <a href="mailto:hello@example.test">Book a demo</a>
          </Button>
          <Button asChild variant="outline">
            <a href="#lineage">Trace the pipeline</a>
          </Button>
        </div>
        <div className="lineage" id="lineage">
          {stages.map(([label, title, detail], index) => (
            <article className={index === 2 ? 'lineage-step active' : 'lineage-step'} key={label}>
              <small>{label}</small>
              <strong>{title}</strong>
              <span>{detail}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="control" id="control">
        <div className="shell control-grid">
          <div>
            <p className="eyebrow">Explicit boundaries</p>
            <h2>One application. Context stays visible.</h2>
          </div>
          <p>
            Platform operations and tenant workspaces share a shell, while the API, application
            core, repository, and database each enforce authority independently.
          </p>
        </div>
      </section>
    </main>
  );
}
