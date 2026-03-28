import { tw } from 'tailwind-styled-v4'

export const Card = tw.div`
  flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm
  overflow-hidden transition-shadow hover:shadow-md

  header {
    px-6 py-4 border-b border-gray-100
    font-semibold text-lg text-gray-900
    bg-gray-50
  }
  
  body {
    flex-1 px-6 py-4
    text-gray-600
  }
  
  footer {
    px-6 py-4 border-t border-gray-100
    text-sm text-gray-500
    bg-gray-50
  }
  
  image {
    w-full aspect-video object-cover
  }
`

export const PrimaryCard = Card.extend`
  border-blue-200
  
  header {
    bg-blue-50 text-blue-800
    border-blue-100
  }
  body {
    text-blue-700
  }
`

export const ElevatedCard = Card.extend`
  shadow-lg border-0
  hover:shadow-xl
`