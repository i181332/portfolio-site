import { motion } from "framer-motion";
import { skills } from "../data/profile";
import {
    SiPython,
    SiCplusplus,
    SiTypescript,
    SiJavascript,
    SiReact,
    SiElectron,
    SiPytorch,
    SiTensorflow,
    SiFlask,
    SiFastapi,
    SiGit,
    SiDocker,
    SiSqlite,
    SiPandas,
    SiNumpy,
} from "react-icons/si";
import { FaJava } from "react-icons/fa";
import { VscCode } from "react-icons/vsc";
import { TbBrandCSharp } from "react-icons/tb";

const Skills = () => {
    const iconMap: { [key: string]: React.ReactNode } = {
        Python: <SiPython />,
        "C++": <SiCplusplus />,
        "C#": <TbBrandCSharp />,
        TypeScript: <SiTypescript />,
        JavaScript: <SiJavascript />,
        Java: <FaJava />,
        React: <SiReact />,
        Electron: <SiElectron />,
        PyTorch: <SiPytorch />,
        TensorFlow: <SiTensorflow />,
        Flask: <SiFlask />,
        FastAPI: <SiFastapi />,
        Git: <SiGit />,
        Docker: <SiDocker />,
        "VS Code": <VscCode />,
        SQLite: <SiSqlite />,
        Pandas: <SiPandas />,
        NumPy: <SiNumpy />,
    };

    const categories = [
        { title: "Languages", items: skills.languages },
        { title: "Frameworks", items: skills.frameworks },
        { title: "Tools", items: skills.tools },
        { title: "ML/AI", items: skills.ml },
    ];

    return (
        <section id="skills" className="py-24">
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="section-heading"
                data-num="02."
            >
                Skills
            </motion.h2>

            <div className="grid md:grid-cols-2 gap-8">
                {categories.map((category, categoryIndex) => (
                    <motion.div
                        key={category.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                        viewport={{ once: true }}
                        className="card"
                    >
                        <h3 className="text-[var(--lightest-slate)] font-semibold mb-6 font-mono">
                            {category.title}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {category.items.map((skill) => (
                                <div
                                    key={skill}
                                    className="flex items-center gap-2 px-3 py-2 bg-[var(--navy)] rounded text-sm text-[var(--slate)] hover:text-[var(--green)] transition-colors"
                                >
                                    <span className="text-lg">
                                        {iconMap[skill] || "•"}
                                    </span>
                                    <span>{skill}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default Skills;
