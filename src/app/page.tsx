// import { sql } from '@vercel/postgres';
import { Form } from '@/app/form';

export default function Home() {
  return (
    <body className=''>
      <div className='flex justify-center m-10'>
        <h1 className='text-4xl'>Register a widget</h1>
      </div>

      <main className='flex justify-center w-full'>
        <Form />
      </main>
    </body>

  )
}