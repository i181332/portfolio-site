const Footer = () => {
    return (
        <footer className="py-6 text-center">
            <p className="text-[var(--slate)] text-sm font-mono">
                Designed & Built by{" "}
                <a
                    href="https://github.com/yourusername"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--green)] hover:underline"
                >
                    Yuta Matsuo
                </a>
            </p>
        </footer>
    );
};

export default Footer;
