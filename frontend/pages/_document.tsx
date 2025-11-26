import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        {/* Protection contre les scripts malveillants ou boucles infinies */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Bloquer les fonctions check() qui font des requêtes en boucle
              if (typeof window !== 'undefined') {
                const originalFetch = window.fetch;
                let requestCount = {};
                const MAX_REQUESTS_PER_SECOND = 5;
                
                window.fetch = function(...args) {
                  const url = args[0];
                  if (typeof url === 'string' && url.includes('/explorer')) {
                    const now = Date.now();
                    const key = url;
                    if (!requestCount[key]) {
                      requestCount[key] = { count: 0, resetTime: now + 1000 };
                    }
                    
                    const record = requestCount[key];
                    if (now > record.resetTime) {
                      record.count = 0;
                      record.resetTime = now + 1000;
                    }
                    
                    if (record.count >= MAX_REQUESTS_PER_SECOND) {
                      console.warn('[BLOCKED] Trop de requêtes vers /explorer, requête bloquée');
                      return Promise.reject(new Error('Too many requests'));
                    }
                    
                    record.count++;
                  }
                  return originalFetch.apply(this, args);
                };
              }
            `
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}


