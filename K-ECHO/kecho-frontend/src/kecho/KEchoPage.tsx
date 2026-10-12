import { useEffect } from "react";
import KEchoPlayer from "../../KEchoPlayer";

const SUGGESTIONS = ["사랑해", "복수", "선생님", "택시"];
// Empty in dev (Vite proxies /api); set to the deployed API origin for production builds.
const API_BASE = (import.meta.env.VITE_KECHO_API_BASE ?? "").trim().replace(/\/$/, "");

export default function KEchoPage() {
    useEffect(() => {
        document.title = "데이나이즈 (Daynize) | K-ECHO 대사 검색과 쉐도잉";
    }, []);

    return (
        <section className="kecho-page" aria-labelledby="kecho-title">
            <header className="kecho-page-head">
                <p className="eyebrow">K-DRAMA SHADOWING</p>
                <h1 id="kecho-title">데이나이즈 (Daynize) | K-ECHO</h1>
                <p>드라마 대사를 검색하고 장면을 따라 말해 보세요.</p>
            </header>
            <KEchoPlayer apiBaseUrl={API_BASE} suggestions={SUGGESTIONS} />
        </section>
    );
}
