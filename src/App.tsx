import "./index.css";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import Hero from "./sections/Hero";
import About from "./sections/About";
import Skills from "./sections/Skills";
import Works from "./sections/Works";
import Experience from "./sections/Experience";
import Contact from "./sections/Contact";

function App() {
  return (
    <div className="relative">
      {/* 左サイドバー（デスクトップのみ） */}
      <Sidebar />

      {/* メインコンテンツ */}
      <main className="lg:ml-[280px] px-6 md:px-12 lg:px-24 max-w-[1000px]">
        <Hero />
        <About />
        <Skills />
        <Works />
        <Experience />
        <Contact />
        <Footer />
      </main>

      {/* ソーシャルリンク（左下固定、モバイル非表示） */}
      <div className="fixed bottom-0 left-12 hidden lg:block">
        <div className="flex flex-col items-center gap-6 after:content-[''] after:w-px after:h-24 after:bg-[var(--light-slate)]">
          {/* Sidebarに配置済みなのでここは空 */}
        </div>
      </div>

      {/* メールリンク（右下固定、モバイル非表示） */}
      <div className="fixed bottom-0 right-12 hidden lg:block">
        <div className="flex flex-col items-center gap-6">
          <a
            href="mailto:your-email@example.com"
            className="font-mono text-xs text-[var(--light-slate)] hover:text-[var(--green)] transition-colors"
            style={{ writingMode: "vertical-rl" }}
          >
            your-email@example.com
          </a>
          <div className="w-px h-24 bg-[var(--light-slate)]"></div>
        </div>
      </div>
    </div>
  );
}

export default App;
