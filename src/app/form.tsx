"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

const initialState = {
    message: "",
};

type InputField = {
    id: string;
    label: string;
    type: string;
    required: boolean;
}

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button type="submit" aria-disabled={pending}
            className="bg-slate-50 py-2 px-4 rounded text-black"
        >
            Submit
        </button>
    );
}

export function Form() {
    // update state based on res. of form action
    const [state, setState] = useState(initialState);
    // TODO: 
    const inputs: InputField[] = [
        { id: 'name', label: 'Name', type: 'text', required: true },
        { id: 'description', label: 'Description', type: 'text', required: false },
        { id: 'team', label: 'Team', type: 'text', required: false }
    ]

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget); // event form data -> key-value pairs
        const data: Record<string, string> = {};

        formData.forEach((value, key) => {
            data[key] = value as string; // TODO: some input may not be a string
        })

        console.log(data); // TODO: process/upload data to DB

        setState({ message: "Form submitted!" });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
            {inputs.map(({ id, label, type, required }) => (
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
            ))}
            <SubmitButton />
            <p aria-live="polite" className="sr-only" role="status">
                {state?.message}
            </p>
        </form>
    )
}