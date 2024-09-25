import { useFormStatus } from "react-dom";

export default function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button type="submit" aria-disabled={pending}
            className="bg-slate-50
                px-5
                py-3
                my-7
                rounded
                text-black
                hover:bg-alpbGreen
                hover:text-white
                transition
                duration-100
                "
        >
            Register
        </button>
    );
}