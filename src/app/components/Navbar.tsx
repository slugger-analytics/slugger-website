import React from 'react'
import ProfileButton from './ProfileButton'
import MenuButton from './MenuButton'

type InputProps = {
    initials: string
}

export default function Navbar({ initials } : InputProps) {
  return (
    <div className='w-full sticky top-0 h-20 bg-alpbBlue flex items-center'>
        <MenuButton />
        <div className='flex-grow'></div>
        <ProfileButton initials={initials}/>
    </div>
  )
}
