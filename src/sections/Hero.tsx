import { motion } from "framer-motion";
import { profile } from "../data/profile";
import { FiChevronDown } from "react-icons/fi";

const Hero = () => {
    return (
        <section
            id="hero"
            className="min-h-screen flex flex-col justify-center relative"
        >
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <p className="text-[var(--green)] font-mono mb-5">Hi, my name is</p>
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-7xl font-bold text-[var(--lightest-slate)] mb-4"
            >
                {profile.name}
            </motion.h1>

            <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl md:text-6xl font-bold text-[var(--slate)] mb-6"
            >
                {profile.tagline}
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="max-w-xl text-[var(--slate)] text-lg leading-relaxed mb-12"
            >
                AIを活用した業務効率化ツールの開発に情熱を持つソフトウェアエンジニアです。
                ユーザーの課題を解決する実用的なプロダクトを創ることが好きです。
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
            >
                <a href="#works" className="btn">
                    Check out my work!
                </a>
            </motion.div>

            {/* スクロールインジケーター */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    <FiChevronDown className="text-[var(--green)] text-2xl" />
                </motion.div>
            </motion.div>
        </section>
    );
};

export default Hero;
