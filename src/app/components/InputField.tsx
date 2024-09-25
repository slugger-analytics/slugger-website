import React from 'react'

type InputProps = {
    id: string,
    label: string,
    type: string,
    required: boolean,
    placeholder?: string
}

// TODO maybe add seperate component for checkbox
export default function TextInput({ id, label, type, required, placeholder}: InputProps) {
  return (
      <div key={id} className="mb-5 w-full">
          <label htmlFor={id} className="block mb-1 text-m ">{label}</label>
          <input
              type={type}
              id={id}
              name={id}
              required={required}
              placeholder={placeholder}
              className="border 
                border-gray-300 
                rounded 
                p-2
                text-black
                text-sm
                font-normal
                w-full
                "
          />
      </div>
  )
}
