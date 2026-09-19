'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div
                    style={{
                        display: 'flex',
                        minHeight: '100vh',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        fontFamily: 'system-ui, sans-serif',
                    }}
                >
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>Application error</h2>
                    <p style={{ fontSize: 14, opacity: 0.7 }}>
                        {error?.message || 'Something went wrong while loading the app.'}
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: 'none',
                            background: '#7c3aed',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
