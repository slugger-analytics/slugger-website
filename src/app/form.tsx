"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation'; 
import InputField from "./components/InputField";
import TextareaInput from "./components/TextareaInput";
import SubmitButton from "./components/SubmitButton";
import SelectField from "./components/SelectField";

const initialState = {
    message: "",
};



export function Form() {
    // update state based on res. of form action
    const [state, setState] = useState(initialState);
    const router = useRouter();

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget); // event form data -> key-value pairs
        const data: Record<string, string> = {};

        formData.forEach((value, key) => {
            data[key] = value as string; // TODO: some input may not be a string
        })

        console.log(data); // TODO: process/upload data to DB
        router.push('/form-submitted');
        setState({ message: "Form submitted!" });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center w-80">
            <InputField 
                id='email'
                label='Email'
                type='email'
                required={true}
                placeholder="your@email.com"
            />
            <InputField
                id='widget-name'
                label='Widget name'
                type='text'
                required={true}
                placeholder='Your widget name'
            />
            <TextareaInput
                id='description'
                label='Description'
                required={false}
                placeholder="A widget description"
            />
            <SelectField
                id='visibility'
                label='Visibility'
                required={true}
                options={[
                    'Private',
                    'Public'
                ]}
            />
            <SubmitButton />
            <p aria-live="polite" className="sr-only" role="status">
                {state?.message}
            </p>
        </form>
    )
}