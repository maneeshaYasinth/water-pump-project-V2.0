import React from "react";
import { motion } from "framer-motion";

const Loader = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-sky-300 via-sky-400 to-blue-500">
      {/* Central Droplet */}
      <motion.div
        className="relative w-20 h-20 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1], rotate: [0, 360, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 0.5,
          ease: "easeInOut",
        }}
      >
        <div className="absolute w-10 h-10 bg-gradient-to-br from-teal-200 to-blue-400 rounded-full shadow-lg shadow-blue-800/30" />
      </motion.div>

      {/* Ripples */}
      <motion.div
        className="absolute w-20 h-20 border-4 border-white/60 rounded-full"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0.8, 0, 0.8], scale: [1, 2.5, 1] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-32 h-32 border-4 border-white/30 rounded-full"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0.6, 0, 0.6], scale: [1.2, 3, 1.2] }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          delay: 0.7,
          ease: "easeInOut",
        }}
      />

      {/* Text */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: [0, 1, 0], y: [10, 0, 10] }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-20 text-white text-lg font-semibold tracking-wider"
      >
        Flowing Data...
      </motion.p>
    </div>
  );
};

export default Loader; // 👈 Important!
