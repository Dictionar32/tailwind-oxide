const { transformSource } = require('./packages/compiler/dist/index.cjs');

const code = `
import { tw } from 'tailwind-styled-v4'

export const Alert = tw.div\`
  relative flex items-start gap-3

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
    flex-shrink-0
  }
\`

export const InfoAlert = Alert.extend\`
  border-l-blue-500 bg-blue-50
\`
`;

const result = transformSource(code, { filename: 'Alert.tsx' });
console.log(result.code);
