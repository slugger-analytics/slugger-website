// import { sql } from '@vercel/postgres';
import { Form } from '@/app/form';

export default function Home() {
  return (
    <body className='bg-slate-900'>
      <main className='flex justify-center'>
        <Form />
      </main>
    </body>

  )
}