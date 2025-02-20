export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Registration Pending
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your widget developer account registration is pending approval. 
          You will receive an email with your API key once approved.
        </p>
      </div>
    </div>
  );
} 