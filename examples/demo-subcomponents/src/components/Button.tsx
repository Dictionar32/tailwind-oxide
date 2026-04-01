import { tw } from 'tailwind-styled-v4'

export const Button = tw.button`
  relative inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
  bg-blue-500 text-white
  hover:bg-blue-600 hover:scale-105
  focus:ring-2 focus:ring-blue-400 focus:outline-none
  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100

  icon {
    inline-block w-5 h-5
    transition-transform duration-200
    group-hover:translate-x-0.5
  }
  
  text {
    inline-block
  }
  
  badge {
    absolute -top-2 -right-2
    inline-flex items-center justify-center
    min-w-5 h-5 px-1
    text-xs font-bold text-white
    bg-red-500 rounded-full
  }
`

export const SecondaryButton = Button.extend`
  bg-gray-200 text-gray-800
  hover:bg-gray-300
`

export const DangerButton = Button.extend`
  bg-red-500 text-white
  hover:bg-red-600
`

export const OutlineButton = tw.button`
  relative inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
  border-2 border-blue-500 text-blue-500
  hover:bg-blue-500 hover:text-white
  focus:ring-2 focus:ring-blue-400 focus:outline-none

  icon {
    inline-block w-5 h-5
  }

  text {
    inline-block
  }
  
  badge {
    absolute -top-2 -right-2
    inline-flex items-center justify-center
    min-w-5 h-5 px-1
    text-xs font-bold text-white
    bg-red-500 rounded-full
  }
`
