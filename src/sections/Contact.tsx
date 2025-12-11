import { motion } from "framer-motion";
import { profile } from "../data/profile";

const Contact = () => {
    return (
        <section id="contact" className="py-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="max-w-xl mx-auto text-center"
            >
                <p className="text-[var(--green)] font-mono text-sm mb-4" data-num="05.">
                    05. What's Next?
                </p>
                <h2 className="text-4xl md:text-5xl font-bold text-[var(--lightest-slate)] mb-6">
                    Get In Touch
                </h2>
                <p className="text-[var(--slate)] mb-12 leading-relaxed">
                    現在、新しい機会を探しています。ご質問がある場合やお話しする機会がございましたら、
                    お気軽にご連絡ください。できる限りお返事いたします！
                </p>
                <a href={`mailto:${profile.email}`} className="btn">
                    Say Hello
                </a>
            </motion.div>
        </section>
    );
};

export default Contact;
