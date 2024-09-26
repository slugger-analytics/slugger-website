"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation'; 
import InputField from "./InputField";
import TextareaInput from "./TextareaInput";
import SubmitButton from "./SubmitButton";
import SelectField from "./SelectField";

const initialState = {
    message: "",
};



export function WidgetForm() {
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
                subtext="You'll recieve updates about your widget through this email."
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
                placeholder="A brief description"
            />
            <SelectField
                id='visibility'
                label='Visibility'
                required={true}
                options={[
                    'Your team only - Hagerstown Flying Boxcars',
                    'Custom - Analytics Group 1',
                    'Public'
                ]}
                subtext='You can change this option later.'
            />
            <SubmitButton btnText="Register"/>
            <p aria-live="polite" className="sr-only" role="status">
                {state?.message}
            </p>
            
        </form>
    )
}