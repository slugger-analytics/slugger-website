import { useFormStatus } from "react-dom";

export default function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button type="submit" aria-disabled={pending}
            className="bg-slate-50
                py-2
                px-4
                rounded
                text-black
                hover:bg-alpbGreen
                hover:text-white
                transition
                duration-100
                "
        >
            Submit
        </button>
    );
}