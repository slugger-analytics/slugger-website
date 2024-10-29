import React from "react";

type TextareaProps = {
  id: string;
  label: string;
  required: boolean;
  placeholder: string;
};

export default function TextareaInput({
  id,
  label,
  required,
  placeholder,
}: TextareaProps) {
  return (
    <div key={id} className="mb-5 w-full">
      <label htmlFor={id} className="block mb-1 text-m">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        required={required}
        placeholder={placeholder}
        className="border
                    border-gray-300
                    rounded
                    p-2
                    text-black
                    w-full
                    text-sm
                    font-normal
                    "
      />
    </div>
  );
}
