import { tw } from 'tailwind-styled-v4'

export const Alert = tw.div`
  relative flex items-start gap-3 rounded-lg p-4
  border-l-4

  icon {
    flex-shrink-0 w-5 h-5
  }
  
  content {
    flex-1
  }
  
  title {
    font-semibold mb-1
  }
  
  message {
    text-sm
  }
  
  close {
    flex-shrink-0 w-4 h-4
    opacity-50 cursor-pointer
    hover:opacity-100
    transition-opacity
  }
`

export const InfoAlert = Alert.extend`
  border-l-blue-500 bg-blue-50
  icon { text-blue-500 }
  title { text-blue-800 }
  message { text-blue-700 }
`

export const SuccessAlert = Alert.extend`
  border-l-green-500 bg-green-50
  icon { text-green-500 }
  title { text-green-800 }
  message { text-green-700 }
`

export const WarningAlert = Alert.extend`
  border-l-yellow-500 bg-yellow-50
  icon { text-yellow-500 }
  title { text-yellow-800 }
  message { text-yellow-700 }
`

export const ErrorAlert = Alert.extend`
  border-l-red-500 bg-red-50
  icon { text-red-500 }
  title { text-red-800 }
  message { text-red-700 }
`