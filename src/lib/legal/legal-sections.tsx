import type { ReactNode } from "react";

export interface LegalSection {
  title: string;
  content: ReactNode;
}

export function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <div key={section.title}>
          <h2>{section.title}</h2>
          {section.content}
        </div>
      ))}
    </>
  );
}
