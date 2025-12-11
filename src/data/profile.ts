// プロフィールデータ
export const profile = {
    name: "松尾 裕太",
    nameEn: "Yuta Matsuo",
    title: "Software Engineer",
    tagline: "AIと業務効率化で、より良いプロダクトを創る",
    email: "your-email@example.com",
    github: "https://github.com/yourusername",
    linkedin: "https://linkedin.com/in/yourusername",
};

export const about = {
    description: [
        "北陸先端科学技術大学院大学（JAIST）で先端科学技術を専攻しています。",
        "AIを活用した業務効率化ツールの開発に情熱を持っており、実用的なプロダクトを作ることが好きです。",
        "特に、LLMを活用したアプリケーション開発に力を入れています。",
    ],
    highlights: [
        "高専 → 専攻科 → JAIST大学院",
        "AIプロダクト開発",
        "業務効率化ツール設計",
    ],
};

export const skills = {
    languages: ["Python", "C++", "C#", "TypeScript", "JavaScript", "Java", "C"],
    frameworks: ["React", "Electron", "PyTorch", "TensorFlow", "Flask", "FastAPI"],
    tools: ["Git", "Docker", "VS Code", "Claude API", "Deepgram", "SQLite"],
    ml: ["PyTorch", "Transformers", "Scikit-learn", "Pandas", "NumPy"],
};

export const works = [
    {
        id: "career-manager",
        title: "Career Manager",
        description: "就職活動を一元管理するElectronデスクトップアプリケーション。企業情報、イベント、ES、面接記録を統合管理。",
        image: "/projects/career-manager.png",
        tags: ["Electron", "React", "TypeScript", "SQLite"],
        github: "https://github.com/yourusername/career-manager",
        demo: null,
        featured: true,
    },
    {
        id: "interview-assistant",
        title: "Interview Assistant",
        description: "リアルタイム音声認識とAIを活用した面接支援ツール。面接官の質問に対して最適な回答案を即座に提案。",
        image: "/projects/interview-assistant.png",
        tags: ["Python", "Claude API", "Deepgram", "PyQt6"],
        github: "https://github.com/yourusername/interview-assistant",
        demo: null,
        featured: true,
    },
    {
        id: "screen-assistant",
        title: "Screen Assistant",
        description: "スクリーンキャプチャとAI分析を組み合わせた開発支援ツール。コード生成やデバッグを自動化。",
        image: "/projects/screen-assistant.png",
        tags: ["Python", "Gemini API", "PyAutoGUI"],
        github: "https://github.com/yourusername/screen-assistant",
        demo: null,
        featured: true,
    },
];

export const experience = [
    {
        title: "ソフトウェアエンジニア インターン",
        company: "金沢エンジニアリングシステムズ",
        period: "2024年",
        description: "業務効率化ツールの開発に従事。社内システムの改善提案と実装を担当。",
    },
    {
        title: "大学院生",
        company: "北陸先端科学技術大学院大学 (JAIST)",
        period: "2025年4月 - 現在",
        description: "先端科学技術研究科にて、AI・機械学習の研究に取り組む。",
    },
];

export const socialLinks = [
    { name: "GitHub", url: "https://github.com/yourusername", icon: "github" },
    { name: "LinkedIn", url: "https://linkedin.com/in/yourusername", icon: "linkedin" },
    { name: "Email", url: "mailto:your-email@example.com", icon: "email" },
];
