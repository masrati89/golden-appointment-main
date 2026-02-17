import { motion } from 'framer-motion';

/**
 * AmbientBackground - Creates a subtle, slow-moving golden light effect
 * that adds depth and luxury to the application background.
 * 
 * Uses 2-3 large, highly blurred blobs that drift, rotate, and pulse
 * in an extremely slow, barely perceptible motion.
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Blob 1 - Top Left */}
      <motion.div
        className="absolute w-[600px] h-[600px] md:w-[800px] md:h-[800px] lg:w-[1000px] lg:h-[1000px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(212, 184, 150, 0.25) 0%, rgba(212, 184, 150, 0) 70%)',
          top: '-20%',
          left: '-10%',
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -25, 15, 0],
          scale: [1, 1.1, 0.95, 1],
          rotate: [0, 5, -3, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Blob 2 - Bottom Right */}
      <motion.div
        className="absolute w-[500px] h-[500px] md:w-[700px] md:h-[700px] lg:w-[900px] lg:h-[900px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(212, 184, 150, 0.2) 0%, rgba(212, 184, 150, 0) 70%)',
          bottom: '-15%',
          right: '-5%',
        }}
        animate={{
          x: [0, -25, 20, 0],
          y: [0, 30, -15, 0],
          scale: [1, 0.9, 1.05, 1],
          rotate: [0, -4, 6, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Blob 3 - Center (Subtle) */}
      <motion.div
        className="absolute w-[400px] h-[400px] md:w-[600px] md:h-[600px] lg:w-[800px] lg:h-[800px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(212, 184, 150, 0.15) 0%, rgba(212, 184, 150, 0) 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          x: [0, 15, -10, 0],
          y: [0, -20, 10, 0],
          scale: [1, 1.05, 0.98, 1],
          rotate: [0, 3, -2, 0],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
