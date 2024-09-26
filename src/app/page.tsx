import { LoginForm } from './components/login-form';
import Navbar from './components/navbar/Navbar';

export default function Home() {
    return (
        <body>
            <Navbar />
            <div className='w-full flex justify-center'>
                <div className='bg-gray-100 min-w-100 w-1/2 px-10 my-10 shadow-md rounded-lg'>
                    <div className='flex justify-center'>
                        <h1>Sign in</h1>
                    </div>

                    <main className='flex justify-center w-full'>
                        <LoginForm />
                    </main>
                </div>
            </div>


        </body>
    )
}