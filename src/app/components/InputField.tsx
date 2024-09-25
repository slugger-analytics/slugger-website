import React from 'react'

type InputProps = {
    id: string,
    label: string,
    type: string,
    required: boolean
}

export default function TextInput({ id, label, type, required}: InputProps) {
  return (
      <div key={id} className="mb-5">
          <label htmlFor={id} className="block mb-1">{label}</label>
          <input
              type={type}
              id={id}
              name={id}
              required={required}
              className="border border-gray-300 rounded py-2 px-3 text-black"
          />
      </div>
  )
}
