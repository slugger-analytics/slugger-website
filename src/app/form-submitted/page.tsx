import React from 'react'
import { CiCircleCheck } from "react-icons/ci";
import Navbar from '../components/navbar/Navbar';

export default function page() {
  return (
    <body>
      <Navbar initials={"DB"} />
      <div className='flex flex-col justify-center items-center m-20'>
        <h1>Thank you!</h1>
        <p className='text-m'>Your widget has been registered.</p>
        <CiCircleCheck size={100} className='m-5' />
      </div>
    </body>
  )
}
