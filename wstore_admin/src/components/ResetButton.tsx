import { RotateCcw } from 'lucide-react';

interface ResetButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function ResetButton({ onClick, disabled }: ResetButtonProps) {
  return (
    <div>
      <button
        className="btn-outline"
        style={{
          width: '100%',
          height: '45px',
          justifyContent: 'center',
          color: 'var(--danger)',
          borderColor: 'var(--danger)',
          opacity: disabled ? 0.5 : 1
        }}
        onClick={onClick}
        disabled={disabled}
      >
        <RotateCcw size={16} /> Reset
      </button>
    </div>
  );
}
