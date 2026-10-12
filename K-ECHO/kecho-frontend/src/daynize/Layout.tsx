import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./daynize.css";

// Sections of the main Daynize static page (지난주영어/index.html).
const SITE_LINKS = [
    { href: "/#archive", label: "지난주 영어" },
    { href: "/#lessons", label: "동영상 강의" },
    { href: "/#conversation", label: "오늘의 회화" },
    { href: "/#voice", label: "음성 스튜디오" },
];

export default function Layout() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [logoFailed, setLogoFailed] = useState(false);
    const closeMenu = () => setMenuOpen(false);

    return (
        <>
            <a className="skip-link" href="#main">본문 바로가기</a>
            <header className="site-header">
                <div className="wrap nav-row">
                    <a href="/" className="logo-link" aria-label="DAYNIZE 지난 주 영어 홈">
                        {logoFailed ? (
                            <span className="logo-fallback">
                                DAYNIZE<small>지난 주 영어</small>
                            </span>
                        ) : (
                            <img
                                src="/DAYNIZE%20LOGO%20ONLY.png"
                                alt="DAYNIZE 지난 주 영어"
                                className="main-logo-img"
                                onError={() => setLogoFailed(true)}
                            />
                        )}
                    </a>
                    <button
                        className="menu-toggle"
                        type="button"
                        aria-expanded={menuOpen}
                        aria-controls="main-nav"
                        aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                    <nav className={menuOpen ? "main-nav is-open" : "main-nav"} id="main-nav" aria-label="주요 메뉴">
                        {SITE_LINKS.map((link) => (
                            <a key={link.href} href={link.href} onClick={closeMenu}>
                                {link.label}
                            </a>
                        ))}
                        <NavLink to="/" end className={({ isActive }) => (isActive ? "is-active" : "")} onClick={closeMenu}>
                            K-ECHO
                        </NavLink>
                        <a className="nav-cta" href="/#register" onClick={closeMenu}>
                            수강 신청
                        </a>
                    </nav>
                </div>
            </header>

            <main id="main" className="kecho-main">
                <Outlet />
            </main>
        </>
    );
}
