import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
}

export default function EmptyState({ icon, title = 'No data found', description = '' }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
      {icon && <div style={{ opacity: 0.1, marginBottom: '16px' }}>{icon}</div>}
      <p>{title}</p>
      {description && <p style={{ fontSize: '13px', marginTop: '4px' }}>{description}</p>}
    </div>
  );
}
