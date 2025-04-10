"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { AuthProvider } from "./contexts/AuthContext";

const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay,
      ease: [0.25, 0.1, 0.25, 1],
    },
  }),
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.95, transition: { duration: 0.2 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      when: "beforeChildren",
    },
  },
};

export default function Home() {
  return (
    <AuthProvider>
      <div className="relative min-h-screen bg-black flex flex-col font-sans">
        {/* Hero Section */}
        <div className="relative w-full h-screen overflow-hidden">
          <Image
            src="/alpb_background.png"
            alt="ALPB Background"
            layout="fill"
            objectFit="cover"
            className="opacity-60 scale-105 transform hover:scale-110 transition-transform duration-10000"
            priority={true}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-gray-900/90" />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          >
            {/* Logo */}
            <motion.div variants={variants} custom={0} className="mb-8">
              <Image
                src="/alpb-logo.png"
                alt="ALPB Logo"
                width={180}
                height={180}
                className="mx-auto hover:scale-105 transition-transform duration-300"
                priority={true}
              />
            </motion.div>

            {/* Header */}
            <motion.h1
              variants={variants}
              custom={0.2}
              className="text-7xl font-extrabold text-white drop-shadow-lg tracking-tight"
            >
              Welcome to{" "}
              <span className="bg-white text-transparent bg-clip-text">
                SLUGGER
              </span>
            </motion.h1>

            <motion.p
              variants={variants}
              custom={0.4}
              className="text-xl font-medium text-gray-300 mt-8 max-w-3xl leading-relaxed"
            >
              Discover advanced insights and data that redefine your
              understanding of the game. Developed by the Johns Hopkins Sports
              Analytics Research Group.
            </motion.p>

            {/* Buttons */}
            <motion.div
              variants={variants}
              custom={0.6}
              className="flex mt-16 space-x-8"
            >
              <Link href="/sign-in">
                <motion.button
                  whileHover="hover"
                  whileTap="tap"
                  variants={variants}
                  className="text-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-700 px-12 py-4 rounded-lg shadow-lg hover:shadow-blue-500/25 transition duration-300"
                >
                  Sign In
                </motion.button>
              </Link>
              <Link href="/register-account">
                <motion.button
                  whileHover="hover"
                  whileTap="tap"
                  variants={variants}
                  className="text-xl font-semibold text-blue-500 bg-white/10 backdrop-blur-sm px-12 py-4 rounded-lg border-2 border-blue-500/50 hover:bg-blue-500 hover:text-white transition duration-300"
                >
                  Register
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer Section */}
        <motion.footer
          variants={variants}
          custom={0.8}
          initial="hidden"
          animate="visible"
          className="w-full bg-black/90 backdrop-blur-md py-6 text-center border-t border-gray-800"
        >
          <p className="text-sm font-medium text-gray-400">
            Questions?{" "}
            <Link
              href="https://docs.google.com/forms/d/e/1FAIpQLSf2YnXL5XnTFYlzd40fad55tkFnE3ua2Oq-hTIRMQeGmIPHBA/viewform?usp=header"
              className="text-blue-400 hover:text-blue-300 transition-colors duration-300 font-semibold"
            >
              Contact us here
            </Link>
          </p>
        </motion.footer>
      </div>
    </AuthProvider>
  );
}
