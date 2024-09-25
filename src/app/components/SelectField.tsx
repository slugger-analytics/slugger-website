import React from 'react'

type InputProps = {
    id: string,
    label: string,
    required: boolean,
    options: string[]
}

export default function SelectField({ id, label, required, options }: InputProps) {


    return (
        <div key={id} className="mb-5 w-full">
            <label htmlFor={id} className="block mb-1 text-m ">{label}</label>
            <select
                id={id}
                name={id}
                required={required}
                className='w-full text-sm border border-gray-300 rounded p-2'
            >
                {options.map((val, index) =>
                    <option 
                        key={index}
                        value={val}
                    >
                        {val}
                    </option>
                )}
            </select>
        </div>
    )
}