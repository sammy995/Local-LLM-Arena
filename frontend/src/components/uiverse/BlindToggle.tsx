interface BlindToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}

// Uiverse-style switch styled as a mask/eye for Blind evaluation mode.
export function BlindToggle({ checked, onChange, id = "blindMode" }: BlindToggleProps) {
  return (
    <label className="uv-blind" htmlFor={id} title="Blind evaluation mode">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label="Toggle blind evaluation mode"
      />
      <span className="track" />
      <span className="knob" aria-hidden>
        {checked ? "🎭" : "👁"}
      </span>
    </label>
  );
}
