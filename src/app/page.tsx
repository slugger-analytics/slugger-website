// import { sql } from '@vercel/postgres';
import { Form } from '@/app/form';
import Navbar from './components/Navbar';

export default function Home() {
  return (
    <body>
      <Navbar initials={"DB"}/>
      <div className='flex justify-center'>
        <h1>Register a widget</h1>
      </div>

      <main className='flex justify-center w-full'>
        <Form />
      </main>
    </body>

  )
}