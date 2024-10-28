import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white shadow-lg rounded-lg p-10 flex flex-col items-center space-y-6">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4">
          Dashboard coming soon
        </h1>
        <p className="text-lg text-gray-600">
          For now, keep working on those widgets!
        </p>
        <Link href="/register-widget">
          <button className="text-lg font-semibold text-white bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 px-6 py-3 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105">
            Register a Widget
          </button>
        </Link>
      </div>
    </div>
  );
}
