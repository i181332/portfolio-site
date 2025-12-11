import { motion } from "framer-motion";
import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import { profile, socialLinks } from "../data/profile";

const Sidebar = () => {
    const navItems = [
        { name: "About", href: "#about" },
        { name: "Skills", href: "#skills" },
        { name: "Works", href: "#works" },
        { name: "Experience", href: "#experience" },
        { name: "Contact", href: "#contact" },
    ];

    const iconMap: { [key: string]: React.ReactNode } = {
        github: <FiGithub size={20} />,
        linkedin: <FiLinkedin size={20} />,
        email: <FiMail size={20} />,
    };

    return (
        <aside className="fixed left-0 top-0 h-screen w-[280px] flex flex-col justify-between py-24 px-12 z-50 hidden lg:flex">
            {/* 上部: 名前とナビ */}
            <div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-2xl font-bold text-[var(--lightest-slate)] mb-1">
                        {profile.name}
                    </h1>
                    <p className="text-[var(--green)] font-mono text-sm mb-2">
                        {profile.title}
                    </p>
                    <p className="text-[var(--slate)] text-sm leading-relaxed">
                        {profile.tagline}
                    </p>
                </motion.div>

                {/* ナビゲーション */}
                <nav className="mt-16">
                    <ul className="space-y-4">
                        {navItems.map((item, i) => (
                            <motion.li
                                key={item.name}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.1 }}
                            >
                                <a
                                    href={item.href}
                                    className="group flex items-center text-[var(--slate)] hover:text-[var(--green)] transition-colors"
                                >
                                    <span className="w-8 h-[1px] bg-[var(--slate)] group-hover:w-16 group-hover:bg-[var(--green)] transition-all mr-4"></span>
                                    <span className="text-xs font-mono uppercase tracking-widest">
                                        {item.name}
                                    </span>
                                </a>
                            </motion.li>
                        ))}
                    </ul>
                </nav>
            </div>

            {/* 下部: ソーシャルリンク */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex gap-5"
            >
                {socialLinks.map((link) => (
                    <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--slate)] hover:text-[var(--green)] hover:-translate-y-1 transition-all"
                        aria-label={link.name}
                    >
                        {iconMap[link.icon]}
                    </a>
                ))}
            </motion.div>
        </aside>
    );
};

export default Sidebar;
