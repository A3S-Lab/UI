import { useState } from 'react';

const COLLAPSIBLE_HELP_LENGTH = 180;

export interface FieldHelpProps {
  description: string;
  id: string;
  label: string;
}

export function FieldHelp({ description, id, label }: FieldHelpProps) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = description.length > COLLAPSIBLE_HELP_LENGTH || description.includes('\n');

  if (!collapsible) {
    return (
      <p className="a3s-form-help" id={id}>
        {description}
      </p>
    );
  }

  return (
    <div className="a3s-form-help-disclosure">
      <p className="a3s-form-help" id={id} data-expanded={expanded || undefined}>
        {description}
      </p>
      <button
        type="button"
        className="btn"
        data-size="xs"
        data-variant="link"
        aria-controls={id}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Show less' : 'Show more'} help for ${label}`}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? 'Less' : 'More'}
      </button>
    </div>
  );
}
