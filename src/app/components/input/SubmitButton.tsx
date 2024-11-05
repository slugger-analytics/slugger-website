import { useFormStatus } from "react-dom";

type InputProps = {
    btnText: string,
}

export default function SubmitButton({ btnText } : InputProps) {
    const { pending } = useFormStatus();

    return (
        <button type="submit" aria-disabled={pending}
            className="bg-slate-50
                px-5
                py-3
                my-7
                rounded
                text-black
                hover:bg-alpbBlue
                hover:text-white
                transition
                duration-100
                "
        >
            {btnText}
        </button>
    );
}