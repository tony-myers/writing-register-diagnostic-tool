interface SummaryCardsProps {
  selectedTaskLabel: string;
}

export function SummaryCards({ selectedTaskLabel }: SummaryCardsProps) {
  return (
    <section className="task-summary" aria-label="Selected writing task">
      <strong>Selected writing task: {selectedTaskLabel}</strong>
      <p>
        The selected task chooses the relevant AI-style comparison profile and organises metric
        explanations. It is not treated as a standard of good writing.
      </p>
    </section>
  );
}
