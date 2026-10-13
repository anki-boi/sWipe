const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,jsx,ts,tsx}',
        './components/**/*.{js,jsx,ts,tsx}',
    ],
    presets: [require('nativewind/preset')],
    // 'class' lets the app override the system theme from Settings; the color
    // tokens in app/global.css follow whichever scheme is active.
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                rubik: ['Rubik-Regular', 'sans-serif'],
                'rubik-bold': ['Rubik-Bold', 'sans-serif'],
                'rubik-extrabold': ['Rubik-ExtraBold', 'sans-serif'],
                'rubik-medium': ['Rubik-Medium', 'sans-serif'],
                'rubik-semibold': ['Rubik-SemiBold', 'sans-serif'],
                'rubik-light': ['Rubik-Light', 'sans-serif'],
            },
            colors: {
                background: token('background'),
                surface: token('surface'),
                card: token('card'),
                border: token('border'),
                foreground: token('foreground'),
                muted: token('muted'),
                primary: {
                    DEFAULT: token('primary'),
                    strong: token('primary-strong'),
                },
                'on-primary': token('on-primary'),
                danger: token('danger'),
                success: token('success'),
                warning: token('warning'),
            },
        },
    },
    plugins: [],
};
