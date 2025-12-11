import { motion } from "framer-motion";
import { about } from "../data/profile";

const About = () => {
    return (
        <section id="about" className="py-24">
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="section-heading"
                data-num="01."
            >
                About Me
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    viewport={{ once: true }}
                    className="md:col-span-2"
                >
                    <div className="space-y-4 text-[var(--slate)] leading-relaxed">
                        {about.description.map((text, i) => (
                            <p key={i}>{text}</p>
                        ))}
                    </div>

                    <div className="mt-8">
                        <h3 className="text-[var(--lightest-slate)] font-semibold mb-4">
                            ハイライト
                        </h3>
                        <ul className="grid grid-cols-2 gap-2">
                            {about.highlights.map((item, i) => (
                                <li
                                    key={i}
                                    className="flex items-center gap-2 text-[var(--slate)] text-sm"
                                >
                                    <span className="text-[var(--green)]">▹</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>

                {/* プロフィール画像エリア */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="relative group"
                >
                    <div className="relative w-full aspect-square rounded bg-[var(--green)] overflow-hidden">
                        <div className="absolute inset-0 bg-[var(--green)] opacity-40 group-hover:opacity-0 transition-opacity z-10"></div>
                        <div className="w-full h-full bg-[var(--light-navy)] flex items-center justify-center text-[var(--lightest-slate)] text-6xl font-bold">
                            YM
                        </div>
                    </div>
                    <div className="absolute -z-10 top-5 left-5 w-full h-full border-2 border-[var(--green)] rounded group-hover:top-3 group-hover:left-3 transition-all"></div>
                </motion.div>
            </div>
        </section>
    );
};

export default About;
