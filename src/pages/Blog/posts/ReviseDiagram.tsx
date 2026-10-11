// How Revise goes from a PDF to an editable document and back, stage by stage.
// Labels follow the crate layout in the Revise repo's docs/ARCHITECTURE.md.
const rebuildSteps = [
  'Lines',
  'Columns or tables',
  'Paragraphs',
  'Lists and headings',
];

function Link({ label }: { label: string }) {
  return (
    <li className="pd-link" aria-hidden="true">
      <span>{label}</span>
    </li>
  );
}

export function ReviseDiagram() {
  return (
    <figure
      className="pd"
      aria-label="How Revise works: PDFium reads the PDF, rules rebuild it into a document model that your edits change, Parley lays it out, and it's drawn on screen or saved as a new PDF with krilla."
    >
      <ol>
        <li className="pd-node">
          <span className="pd-step">01 · The PDF</span>
          <strong>A PDF file</strong>
          <p>Characters at positions, plus fonts, lines, and images. No paragraphs.</p>
        </li>
        <Link label="PDFium reads it" />
        <li className="pd-node">
          <span className="pd-step">02 · Rebuild</span>
          <strong>Rules about geometry and fonts</strong>
          <p>No AI or OCR, so the same PDF always comes out the same way.</p>
          <ol className="pd-chain">
            {rebuildSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </li>
        <Link label="becomes" />
        <li className="pd-node pd-model">
          <span className="pd-step">03 · Model</span>
          <strong>The document model</strong>
          <p>
            The source of truth from here on. Layout, the screen, and saving all
            read from it.
          </p>
          <span className="pd-edits">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Your typing and formatting change the model, not the PDF
          </span>
        </li>
        <Link label="Parley lays it out" />
        <li className="pd-node">
          <span className="pd-step">04 · Layout</span>
          <strong>Shaping, wrapping, and pages</strong>
          <p>Text shaping, line wrapping, tab stops, lists, tables, and pagination.</p>
        </li>
        <li className="pd-split" aria-hidden="true">
          <span />
        </li>
        <li className="pd-ends">
          <div className="pd-node">
            <span className="pd-step">05 · Screen</span>
            <strong>What you see</strong>
            <p>Drawn on the GPU with egui and wgpu.</p>
          </div>
          <div className="pd-node">
            <span className="pd-step">05 · Save</span>
            <strong>A new PDF</strong>
            <p>
              krilla writes it with embedded fonts and real vector text. Reopen
              it in Revise and the structure comes back.
            </p>
          </div>
        </li>
      </ol>
    </figure>
  );
}
