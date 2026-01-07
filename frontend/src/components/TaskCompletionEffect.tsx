import { useEffect, useState } from 'react';

export default function TaskCompletionEffect() {
    const [particles, setParticles] = useState<Array<{ id: number; style: React.CSSProperties }>>([]);

    useEffect(() => {
        // Generate 6-8 particles
        const count = 6 + Math.floor(Math.random() * 3);
        const newParticles = Array.from({ length: count }).map((_, i) => {
            // Start higher up (-15 to -30px) slightly randomized
            // Horizontal spread (-20 to +20px)
            // Fall down (50 to 90px)
            const startX = (Math.random() - 0.5) * 40;
            const fallDistance = 60 + Math.random() * 40;

            return {
                id: i,
                style: {
                    '--tw-translate-x': `${startX}px`,
                    '--tw-translate-y': `${fallDistance}px`,
                    left: '50%',
                    top: '-20px', // Start from top
                    width: `${3 + Math.random() * 4}px`,
                    height: `${3 + Math.random() * 4}px`,
                    backgroundColor: Math.random() > 0.5 ? '#34d399' : '#fbbf24', // Emerald-400 or Amber-400
                    borderRadius: '50%',
                } as React.CSSProperties,
            };
        });
        setParticles(newParticles);
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible z-50">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute animate-sparkle"
                    style={p.style}
                />
            ))}
        </div>
    );
}
