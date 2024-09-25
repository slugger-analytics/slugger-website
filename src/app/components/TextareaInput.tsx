import React from 'react'

type TextareaProps = {
    id: string,
    label: string,
    required: boolean
}

export default function TextareaInput({ id, label, required }: TextareaProps) {
    return (
        <div key={id} className="mb-5">
            <label htmlFor={id} className="block mb-1">{label}</label>
            <textarea
                id={id}
                name={id}
                required={required}
                className="border border-gray-300 rounded py-2 px-3 text-black"
            />
        </div>
    )
}
