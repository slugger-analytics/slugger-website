import LoginForm from "./LoginForm";
import Link from "next/link";

type SignInPageProps = {
  searchParams?: {
    invite?: string | string[];
  };
};

export default function SignIn({ searchParams }: SignInPageProps) {
  const inviteParam = searchParams?.invite;
  const inviteToken = Array.isArray(inviteParam) ? inviteParam[0] : inviteParam;
  const registerHref = inviteToken
    ? `/register?invite=${encodeURIComponent(inviteToken)}`
    : "/register-account";

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh">
      <LoginForm />
      <div className="flex my-6 font-regular text-sm text-gray-500">
        <p className="mr-3">Don&apos;t have an account yet?</p>
        <Link href={registerHref} className="text-[#2272B4]">
          Register
        </Link>
      </div>
    </div>
  );
}
