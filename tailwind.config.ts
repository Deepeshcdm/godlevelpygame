import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
        // Custom game colors
        mystic: {
          100: '#EAE2FF',
          200: '#D4C5FF', 
          300: '#B9A4FF',
          400: '#9B87F5',
          500: '#7E69AB',
          600: '#6E59A5',
          700: '#4D3B7A',
          800: '#352756',
          900: '#1A1F2C'
        },
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        },
        'pulse-light': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        'quizAppear': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'blink': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' }
        },
        'sparkle': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(0)', opacity: '0' }
        },
        'pulse-glow': {
          '0%, 100%': { textShadow: '0 0 5px rgba(185,164,255,0.8)' },
          '50%': { textShadow: '0 0 20px rgba(185,164,255,0.8)' }
        },
        'runeFlow': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        // New animations for dialogue box
        'dialogueAppear': {
          '0%': { transform: 'translateY(20px) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' }
        },
        'borderGlow': {
          '0%, 100%': { borderColor: 'rgba(155, 135, 245, 0.6)' },
          '50%': { borderColor: 'rgba(185, 164, 255, 0.9)' }
        },
        'mysticShimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        },
        'avatarPulse': {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(155, 135, 245, 0.7)' },
          '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 10px rgba(155, 135, 245, 0)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(155, 135, 245, 0)' }
        },
        'messageSlideIn': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        // Add the soundWave animation for voice visualization
        soundWave: {
          '0%, 100%': { height: '0.75rem' },
          '50%': { height: '1.5rem' },
        },
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
        'float': 'float 2s ease-in-out infinite',
        'pulse-light': 'pulse-light 2s ease-in-out infinite',
        'quizAppear': 'quizAppear 0.4s ease-out forwards',
        'fadeIn': 'fadeIn 0.3s ease-in forwards',
        'blink': 'blink 1s ease-in-out infinite',
        'sparkle': 'sparkle 0.7s ease-in-out forwards',
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
        'runeFlow': 'runeFlow 3s linear infinite',
        // New animations for dialogue box
        'dialogueAppear': 'dialogueAppear 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'borderGlow': 'borderGlow 2s ease-in-out infinite',
        'mysticShimmer': 'mysticShimmer 3s linear infinite',
        'avatarPulse': 'avatarPulse 2s ease-in-out infinite',
        'messageSlideIn': 'messageSlideIn 0.3s ease-out forwards',
        // Add the soundWave animation for voice visualization
        soundWave: 'soundWave 1.5s ease-in-out infinite',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
