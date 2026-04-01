const { transformSource } = require('./packages/compiler/dist/index.cjs');

const code = `
const Button = tw.button\`
  relative inline-flex

  icon {
    inline-block w-5 h-5
  }

  text {
    inline-block
  }
\`

const PrimaryButton = Button.extend\`
  bg-indigo-600 text-white
\`
`;

const result = transformSource(code, { filename: 'test.tsx' });
console.log(result.code);
