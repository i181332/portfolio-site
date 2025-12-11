import { motion } from "framer-motion";
import { works } from "../data/profile";
import { FiGithub, FiExternalLink, FiFolder } from "react-icons/fi";

const Works = () => {
    const featuredWorks = works.filter((w) => w.featured);

    return (
        <section id="works" className="py-24">
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="section-heading"
                data-num="03."
            >
                Featured Works
            </motion.h2>

            <div className="space-y-24">
                {featuredWorks.map((work, index) => (
                    <motion.div
                        key={work.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className={`grid md:grid-cols-12 gap-4 items-center ${index % 2 === 1 ? "md:text-right" : ""
                            }`}
                    >
                        {/* プロジェクト画像 */}
                        <div
                            className={`md:col-span-7 relative group ${index % 2 === 1 ? "md:order-2" : ""
                                }`}
                        >
                            <div className="relative rounded overflow-hidden bg-[var(--green)]">
                                <div className="absolute inset-0 bg-[var(--navy)] opacity-80 group-hover:opacity-0 transition-opacity z-10"></div>
                                <div className="aspect-video bg-[var(--light-navy)] flex items-center justify-center">
                                    <FiFolder className="text-6xl text-[var(--green)] opacity-50" />
                                </div>
                            </div>
                        </div>

                        {/* プロジェクト情報 */}
                        <div
                            className={`md:col-span-5 ${index % 2 === 1 ? "md:order-1 md:text-right" : "md:-ml-16"
                                } relative z-10`}
                        >
                            <p className="text-[var(--green)] font-mono text-sm mb-2">
                                Featured Project
                            </p>
                            <h3 className="text-2xl font-bold text-[var(--lightest-slate)] mb-4">
                                {work.title}
                            </h3>
                            <div className="bg-[var(--light-navy)] p-6 rounded shadow-lg mb-4">
                                <p className="text-[var(--light-slate)] text-sm leading-relaxed">
                                    {work.description}
                                </p>
                            </div>
                            <div
                                className={`flex flex-wrap gap-2 mb-4 ${index % 2 === 1 ? "justify-end" : ""
                                    }`}
                            >
                                {work.tags.map((tag) => (
                                    <span key={tag} className="tag">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <div
                                className={`flex gap-4 ${index % 2 === 1 ? "justify-end" : ""
                                    }`}
                            >
                                {work.github && (
                                    <a
                                        href={work.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[var(--lightest-slate)] hover:text-[var(--green)] transition-colors"
                                        aria-label="GitHub"
                                    >
                                        <FiGithub size={20} />
                                    </a>
                                )}
                                {work.demo && (
                                    <a
                                        href={work.demo}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[var(--lightest-slate)] hover:text-[var(--green)] transition-colors"
                                        aria-label="Live Demo"
                                    >
                                        <FiExternalLink size={20} />
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default Works;
