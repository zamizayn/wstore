import React from 'react';

interface FilterCardProps {
  children: React.ReactNode;
}

export default function FilterCard({ children }: FilterCardProps) {
  return (
    <div className="white-card" style={{ marginBottom: '32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
        {children}
      </div>
    </div>
  );
}
