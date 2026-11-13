
"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import './CustomSelect.css';

export type SelectOption = string;

interface CustomSelectProps {
  options?: SelectOption[];
  onSelect?: (option: SelectOption) => void;
  disabled?: boolean;
  value?: SelectOption;
  placeholder?: string;
}

function CustomSelect({
  options = ["Pause", "Complete", "Partially Complete"],
  onSelect,
  disabled = false,
  value: controlledValue,
  placeholder = "Choose",
}: CustomSelectProps) {
  const [value, setValue] = useState<SelectOption | "">(controlledValue || "");
  const [open, setOpen] = useState<boolean>(false);
  const selectedValue = controlledValue ?? value;

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  return (
    <div className="custom-select" ref={ref}>
      <button
        type="button"
        className={`select-trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{selectedValue || placeholder}</span>

        <ChevronDown
          size={15}
          className={open ? "rotate" : ""}
        />
      </button>

      {open && (
        <div className="select-menu" role="listbox">
          {options.map((option) => (
            <button
              type="button"
              key={option}
              role="option"
              aria-selected={selectedValue === option}
              className={`select-option ${
                selectedValue === option ? "selected" : ""
              }`}
              onClick={() => {
                setValue(option);
                setOpen(false);
                onSelect?.(option);
              }}
            >
              <span>{option}</span>

              {selectedValue === option && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
