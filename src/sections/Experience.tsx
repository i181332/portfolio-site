import { motion } from "framer-motion";
import { experience } from "../data/profile";

const Experience = () => {
    return (
        <section id="experience" className="py-24">
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="section-heading"
                data-num="04."
            >
                Experience
            </motion.h2>

            <div className="relative">
                {/* タイムライン */}
                <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-[var(--lightest-navy)] transform md:-translate-x-1/2"></div>

                <div className="space-y-12">
                    {experience.map((exp, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className={`relative flex md:items-center ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                                }`}
                        >
                            {/* タイムラインドット */}
                            <div className="absolute left-0 md:left-1/2 w-3 h-3 bg-[var(--green)] rounded-full transform -translate-x-1/2 border-4 border-[var(--navy)]"></div>

                            {/* コンテンツ */}
                            <div
                                className={`ml-8 md:ml-0 md:w-1/2 ${index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"
                                    }`}
                            >
                                <div className="card">
                                    <span className="text-[var(--green)] font-mono text-sm">
                                        {exp.period}
                                    </span>
                                    <h3 className="text-xl font-semibold text-[var(--lightest-slate)] mt-2">
                                        {exp.title}
                                    </h3>
                                    <p className="text-[var(--green)] font-mono text-sm mt-1">
                                        @ {exp.company}
                                    </p>
                                    <p className="text-[var(--slate)] mt-4 text-sm leading-relaxed">
                                        {exp.description}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Experience;
