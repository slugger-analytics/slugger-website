"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import InputField from "../components/InputField";
import SubmitButton from "../components/SubmitButton";
import SelectField from "../components/SelectField";

const initialState = {
    message: "",
    textColor: "black",
};

export function SignupForm() {
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

        if (data["password"] != data["confirm-password"]) {
            setState({ 
                message: "Error: password don't match",
                textColor: "text-red-500",
            });
            return;
        } else {
            setState({
                message: "",
                textColor: "black"
            })
        }

        console.log(data); // TODO: process/upload data to DB
        router.push('/home');
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
                required={true} // TODO add logic to confirm password
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
            <p className={`${state.textColor} mb-5`} role="status">
                {state?.message}
            </p>

        </form>
    )
}