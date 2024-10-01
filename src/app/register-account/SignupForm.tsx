"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import InputField from "../components/input/InputField";
import SubmitButton from "../components/input/SubmitButton";
import SelectField from "../components/input/SelectField";

const initialSubmitStatus = {
    message: "",
    textClass: "text-black",
};

export function SignupForm() {
    // update state based on res. of form action
    const [submitStatus, setSubmitStatus] = useState(initialSubmitStatus);
    const router = useRouter();

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget); // event form data -> key-value pairs
        const data: Record<string, string> = {};

        formData.forEach((value, key) => {
            data[key] = value as string;
        })

        // Verify that password match
        if (data["password"] != data["confirm-password"]) {
            setSubmitStatus({ 
                message: "Error: password don't match",
                textClass: "text-red-500",
            });
            return;
        } else {
            setSubmitStatus({
                message: "",
                textClass: "text-black"
            })
            console.log(data); // TODO: process/upload data to DB
            router.push('/');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center w-80">
            <InputField
                id='first-name'
                label='First name'
                type='text'
                required={true}
                placeholder="Enter first name"
            />
            <InputField
                id='last-name'
                label='Last name'
                type='text'
                required={true}
                placeholder="Enter last name"
            />
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
            <InputField
                id="confirm-password"
                label="Confirm password"
                type="Password"
                required={true}
            />
            <SelectField
                id='account-type'
                label='I am a...'
                required={true}
                options={[
                    'Widget Developer',
                    'Other (player, coach, etc.)',
                ]}
            />
            <SubmitButton btnText="Sign up" />
            <p className={`${submitStatus?.textClass} mb-5`} role="status">
                {submitStatus?.message}
            </p>

        </form>
    )
}