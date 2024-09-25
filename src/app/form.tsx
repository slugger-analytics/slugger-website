"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import InputField from "./components/InputField";
import TextareaInput from "./components/TextareaInput";

const initialState = {
    message: "",
};

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
            <InputField 
                id='email'
                label='Username'
                type='text'
                required={true}
            />
            <InputField
                id='widget-name'
                label='Widget Name'
                type='text'
                required={true}
            />
            <TextareaInput
                id='description'
                label='Description'
                required={true}
            />
            <InputField
                id='private'
                label='Private'
                type='checkbox'
                required={true}
            />
            <SubmitButton />
            <p aria-live="polite" className="sr-only" role="status">
                {state?.message}
            </p>
        </form>
    )
}