import React from 'react'

type InputProps = {
    initials: string,
}

export default function ProfileButton({ initials } : InputProps) {
  return (
      <button className='rounded-full size-10 bg-white mx-5 justify-self-end'>
          <p className='text-sm'>{initials}</p>
      </button>
  )
}
