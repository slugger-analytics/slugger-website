// import { sql } from '@vercel/postgres';
import { WidgetForm } from '../components/WidgetForm';
import Navbar from '../components/navbar/Navbar';

export default function Home() {
  return (
    <body>
      <Navbar initials={"DB"}/>
      <div className='flex justify-center'>
        <h1>Register a widget</h1>
      </div>

      <main className='flex justify-center w-full'>
        <WidgetForm />
      </main>
    </body>

  )
}