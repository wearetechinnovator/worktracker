
"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import './CustomSelect.css';

export type SelectOption = "Start" | "Pause" | "Complete" | "Partially Complete";

interface CustomSelectProps {
  options?: SelectOption[];
  onSelect?: (option: SelectOption) => void;
  disabled?: boolean;
}

function CustomSelect({
  options = ["Pause", "Complete", "Partially Complete"],
  onSelect,
  disabled = false,
}: CustomSelectProps) {
  const [value, setValue] = useState<SelectOption | "">("");
  const [open, setOpen] = useState<boolean>(false);

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
        <span>{value || "Choose"}</span>

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
              aria-selected={value === option}
              className={`select-option ${
                value === option ? "selected" : ""
              }`}
              onClick={() => {
                setValue(option);
                setOpen(false);
                onSelect?.(option);
              }}
            >
              <span>{option}</span>

              {value === option && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
