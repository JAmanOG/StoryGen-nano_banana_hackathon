import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Providers } from './providers'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  title: {
    default: 'StoryBook Creator — Create interactive illustrated storybooks',
    template: '%s | StoryBook Creator',
  },
  description:
    "Create beautiful interactive children's storybooks with AI-assisted generation — write, preview, and export page-by-page or whole stories.",
  keywords: [
    'storybook',
    'storybook creator',
    'children books',
    'storybook generator',
    'AI story generator',
    'storybook editor',
    'illustrated storybook',
  ],
  authors: [{ name: 'Nano Banana', url: 'https://example.com' }],
  creator: 'StoryBook Creator',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  openGraph: {
    title: 'StoryBook Creator',
    description:
      "Create beautiful interactive children's storybooks with AI-assisted generation — write, preview, and export page-by-page or whole stories.",
    url: SITE_URL,
    siteName: 'StoryBook Creator',
    images: [
      {
        url: SITE_URL + '/placeholder-logo.png',
        width: 1200,
        height: 630,
        alt: 'StoryBook Creator',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StoryBook Creator',
    description:
      "Create beautiful interactive children's storybooks with AI-assisted generation.",
    images: [SITE_URL + '/placeholder-logo.png'],
    creator: '@nanobanana',
  },
  // icons: {
  //   icon: '/placeholder-logo.png',
  //   shortcut: '/placeholder-logo.png',
  //   apple: '/placeholder-logo.png',
  // },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": SITE_URL + "#website",
        "url": SITE_URL,
        "name": "StoryBook Creator",
        "description": "Create beautiful interactive children's storybooks with AI-assisted generation — write, preview, and export page-by-page or whole stories.",
        "publisher": {
          "@type": "Organization",
          "name": "Nano Banana",
          "url": SITE_URL
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "StoryBook Creator",
        "url": SITE_URL,
        "applicationCategory": "AuthoringTool",
        "operatingSystem": "All",
        "description": "Interactive editor for creating illustrated storybooks, with whole-story and page-by-page modes.",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        }
      }
    ]
  })

  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={SITE_URL} />
        <meta name="robots" content="index,follow" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
