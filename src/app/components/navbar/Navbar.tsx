import React from 'react'
import ProfileButton from './ProfileButton'
import MenuButton from './MenuButton'
import LogoButton from './LogoButton'

type InputProps = {
    initials?: string
}

export default function Navbar({ initials } : InputProps) {
  return (
    <div className='w-full sticky top-0 h-20 bg-alpbBlue flex items-center'>
        <MenuButton />
        <div className='flex-grow' />
        <LogoButton />
      <div className='flex-grow' />
      {initials ? (
        <ProfileButton initials={initials} />
      ) : (
        <div className='size-10 mx-5'></div>
      )}
        
    </div>
  )
}
