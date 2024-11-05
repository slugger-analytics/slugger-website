"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import InputField from "../components/input/InputField";
import SubmitButton from "../components/input/SubmitButton";

const initialSubmitStatus = {
    message: "",
    textClass: "black",
};

export function LoginForm() {
    // update state based on res. of form action
    const [submitStatus, setSubmitStatus] = useState(initialSubmitStatus);
    const router = useRouter();

    // TODO: implement actual authentication
    const authenticate = () => {
        return true;
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget); // event form data -> key-value pairs
        const data: Record<string, string> = {};

        formData.forEach((value, key) => {
            data[key] = value as string; // TODO: some input may not be a string
        })

        if (authenticate()) {
            console.log(data); // TODO: process/upload data to DB
            router.push('/');
        } else {
            console.log("Error submitting form");
            setSubmitStatus({
                message: "Error submitting form",
                textClass: "text-red-500",
            });
        }
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
                id='password'
                label='Password'
                type='password'
                required={true}
            />
            <SubmitButton btnText="Sign in"/>
            <p aria-live="polite" className={`mb-2 ${submitStatus?.textClass}`} role="status">
                {submitStatus?.message}
            </p>

        </form>
    )
}