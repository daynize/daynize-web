import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

export interface KEchoResult {
    match_index: number;
    subtitle_id: number;
    video_id: string;
    youtube_video_id?: string;
    start_time: number;
    end_time: number;
    kr_text: string;
    en_text: string | null;
    drama_title: string;
}

interface SearchResponse {
    query: string;
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    matched_query?: string;
    results: KEchoResult[];
}

interface YTPlayer {
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    playVideo(): void;
    pauseVideo(): void;
    getCurrentTime(): number;
    getPlayerState(): number;
    getVideoData(): { video_id: string };
    loadVideoById(options: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
    destroy(): void;
}

interface YTNamespace {
    Player: new (
        element: HTMLElement,
        options: {
            width?: string;
            height?: string;
            videoId?: string;
            playerVars?: Record<string, string | number>;
            events?: {
                onReady?: () => void;
                onStateChange?: (e: { data: number }) => void;
                onError?: (e: { data: number }) => void;
            };
        },
    ) => YTPlayer;
    PlayerState: { PLAYING: number; ENDED: number };
}

declare global {
    interface Window {
        YT?: YTNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

let ytApiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (!ytApiPromise) {
        ytApiPromise = new Promise((resolve, reject) => {
            const previous = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                previous?.();
                resolve(window.YT as YTNamespace);
            };
            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            script.onerror = () => {
                ytApiPromise = null;
                reject(new Error("YouTube 플레이어를 불러오지 못했습니다."));
            };
            document.head.appendChild(script);
        });
    }
    return ytApiPromise;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, keyword }: { text: string; keyword: string }) {
    // Longest first so the full phrase wins over its individual words.
    const terms = [keyword.trim(), ...keyword.split(/\s+/)]
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        // Allow spaces between characters: "어디가" also marks "어디 가".
        .map((term) => Array.from(term.replace(/\s+/g, ""), escapeRegExp).join("\\s*"));
    if (terms.length === 0) return <>{text}</>;
    // A capturing split puts every match at an odd index.
    const parts = text.split(new RegExp(`(${terms.join("|")})`, "gi"));
    return (
        <>
            {parts.map((part, i) =>
                i % 2 === 1 ? (
                    <mark key={i} className="kecho-mark">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                ),
            )}
        </>
    );
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(1).padStart(4, "0");
    return `${m}:${s}`;
}

const POLL_MS = 100;

function normalizeKeyword(raw: string): string {
    return raw.replace(/^[#\s]+|[#\s]+$/g, "");
}

// YouTube's start/end params only accept whole seconds.
function segmentBounds(seg: KEchoResult): { start: number; end: number } {
    const start = Number.isFinite(seg.start_time) ? Math.max(0, Math.floor(seg.start_time)) : 0;
    const end = Number.isFinite(seg.end_time) ? Math.max(0, Math.floor(seg.end_time)) : start + 1;
    return { start, end: Math.max(end, start + 1) };
}

function safeSeekTo(player: YTPlayer, seconds: number): boolean {
    if (!Number.isFinite(seconds) || seconds < 0) return false;
    try {
        player.seekTo(Math.floor(seconds), true);
        return true;
    } catch {
        return false;
    }
}

function playerErrorMessage(code: number): string {
    switch (code) {
        case 2:
            return "영상 재생 파라미터가 올바르지 않습니다. (YouTube 오류 2)";
        case 5:
            return "외부 재생 제한 또는 Iframe API 로드 오류가 발생했습니다. (YouTube 오류 5)";
        case 100:
            return "영상이 삭제되었거나 비공개입니다. (YouTube 오류 100)";
        case 101:
        case 150:
            return `영상 소유자가 외부 사이트 재생을 허용하지 않았습니다. (YouTube 오류 ${code})`;
        case 153:
            return "플레이어 설정 오류입니다. (YouTube 오류 153: Referer 누락)";
        default:
            return `영상을 재생하지 못했습니다. (YouTube 오류 ${code})`;
    }
}

export interface KEchoPlayerProps {
    apiBaseUrl?: string;
    initialQuery?: string;
    suggestions?: string[];
}

const YOUTUBE_URL_RE =
    /(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export default function KEchoPlayer({ apiBaseUrl = "", initialQuery = "", suggestions = [] }: KEchoPlayerProps) {
    const [input, setInput] = useState(initialQuery);
    const [query, setQuery] = useState(initialQuery.trim());
    const [index, setIndex] = useState(1);
    const [total, setTotal] = useState(0);
    const [matchedQuery, setMatchedQuery] = useState("");
    const [current, setCurrent] = useState<KEchoResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loop, setLoop] = useState(false);
    const [video, setVideo] = useState<string | null>(null);
    const [searchRevision, setSearchRevision] = useState(0);

    const hostRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const playerReadyRef = useRef(false);
    const segmentRef = useRef<KEchoResult | null>(null);
    // True while the current segment should be watched for its end_time.
    const armedRef = useRef(false);
    const loopRef = useRef(loop);

    useEffect(() => {
        loopRef.current = loop;
    }, [loop]);

    useEffect(() => {
        if (!query && !video) return;
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        armedRef.current = false;
        if (playerReadyRef.current) playerRef.current?.pauseVideo();
        const params = new URLSearchParams({ q: query, page: String(index), limit: "1" });
        if (video) params.set("video", video);

        fetch(`${apiBaseUrl}/api/search?${params}`, { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error(`검색에 실패했습니다. (${res.status})`);
                return res.json() as Promise<SearchResponse>;
            })
            .then((data) => {
                if (controller.signal.aborted) return;
                setTotal(data.total);
                setMatchedQuery(data.matched_query ?? data.query);
                setCurrent(data.results[0] ?? null);
            })
            .catch((err: Error) => {
                if (err.name === "AbortError") return;
                setError(err.message);
                setTotal(0);
                setCurrent(null);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [apiBaseUrl, query, index, video, searchRevision]);

    const playSegment = useCallback(() => {
        const player = playerRef.current;
        const seg = segmentRef.current;
        if (!player || !playerReadyRef.current || !seg) return;

        // Reload even for the same video so the end bound is reapplied.
        const { start, end } = segmentBounds(seg);
        armedRef.current = false;
        setError(null);
        try {
            player.loadVideoById({ videoId: seg.video_id, startSeconds: start, endSeconds: end });
            armedRef.current = true;
        } catch {
            setError("YouTube 플레이어가 재생 구간을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.");
        }
    }, []);

    useEffect(() => {
        segmentRef.current = current;
        if (!current) {
            armedRef.current = false;
            if (playerReadyRef.current) playerRef.current?.pauseVideo();
            return;
        }
        if (playerRef.current) {
            playSegment();
            return;
        }

        let cancelled = false;
        loadYouTubeApi()
            .then((YT) => {
                if (cancelled || playerRef.current || !hostRef.current) return;
                // YT replaces its target node with an iframe, so keep it outside React's tree.
                const target = document.createElement("div");
                hostRef.current.appendChild(target);
                const { start, end } = segmentBounds(current);
                // Yields /embed/{id}?start=..&end=..&autoplay=1&enablejsapi=1&origin=..
                playerRef.current = new YT.Player(target, {
                    width: "100%",
                    height: "100%",
                    videoId: current.video_id,
                    playerVars: {
                        start,
                        end,
                        autoplay: 1,
                        enablejsapi: 1,
                        origin: window.location.origin,
                        playsinline: 1,
                        rel: 0,
                    },
                    events: {
                        onReady: () => {
                            playerReadyRef.current = true;
                            if (segmentRef.current) playSegment();
                            else playerRef.current?.pauseVideo();
                        },
                        onStateChange: ({ data }) => {
                            if (data !== YT.PlayerState.ENDED || !armedRef.current) return;
                            if (loopRef.current) playSegment();
                            else armedRef.current = false;
                        },
                        onError: ({ data }) => {
                            armedRef.current = false;
                            setError(playerErrorMessage(data));
                        },
                    },
                });
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err.message);
            });

        return () => {
            cancelled = true;
        };
    }, [current, playSegment]);

    // The IFrame API has no timeupdate event, so poll for end_time.
    useEffect(() => {
        const id = window.setInterval(() => {
            const player = playerRef.current;
            const seg = segmentRef.current;
            const YT = window.YT;
            if (!player || !playerReadyRef.current || !seg || !armedRef.current || !YT) return;
            // Ignore stale times reported while a newly requested video is still loading.
            try {
                if (player.getPlayerState() !== YT.PlayerState.PLAYING) return;
                if (player.getVideoData().video_id !== seg.video_id) return;

                const { start, end } = segmentBounds(seg);
                if (player.getCurrentTime() >= end) {
                    if (loopRef.current) {
                        if (!safeSeekTo(player, start)) armedRef.current = false;
                    } else {
                        player.pauseVideo();
                        armedRef.current = false;
                    }
                }
            } catch {
                armedRef.current = false;
            }
        }, POLL_MS);
        return () => window.clearInterval(id);
    }, []);

    useEffect(
        () => () => {
            playerRef.current?.destroy();
            playerRef.current = null;
            playerReadyRef.current = false;
        },
        [],
    );

    const runSearch = (raw: string) => {
        const videoMatch = raw.match(YOUTUBE_URL_RE);
        if (videoMatch) {
            setInput(raw.trim());
            setQuery("");
            setIndex(1);
            setVideo(videoMatch[1]);
            setSearchRevision((revision) => revision + 1);
            return;
        }
        const q = normalizeKeyword(raw);
        if (!q) return;
        setInput(q);
        if (video) setVideo(null);
        setIndex(1);
        setQuery(q);
        setSearchRevision((revision) => revision + 1);
    };

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        runSearch(input);
    };

    const toggleLoop = useCallback(() => {
        const next = !loopRef.current;
        setLoop(next);
        loopRef.current = next;
        if (next) playSegment();
    }, [playSegment]);

    const togglePlay = useCallback(() => {
        const player = playerRef.current;
        const seg = segmentRef.current;
        const YT = window.YT;
        if (!player || !playerReadyRef.current || !seg || !YT) return;

        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
            player.pauseVideo();
            return;
        }
        const t = player.getCurrentTime();
        const { start, end } = segmentBounds(seg);
        const insideSegment =
            player.getVideoData().video_id === seg.video_id && t >= start && t < end;
        if (insideSegment) {
            armedRef.current = true;
            player.playVideo();
        } else {
            playSegment();
        }
    }, [playSegment]);

    const hasPrev = index > 1;
    const hasNext = index < total;

    // Changing the index refetches; the `current` effect then seeks and plays the new segment.
    const goPrev = useCallback(() => {
        if (hasPrev && !loading) setIndex((i) => i - 1);
    }, [hasPrev, loading]);

    const goNext = useCallback(() => {
        if (hasNext && !loading) setIndex((i) => i + 1);
    }, [hasNext, loading]);

    useEffect(() => {
        const isTyping = (target: EventTarget | null) =>
            target instanceof HTMLElement &&
            (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
            if (!segmentRef.current) return;

            const actions: Record<string, () => void> = {
                " ": togglePlay,
                r: playSegment,
                R: playSegment,
                ArrowLeft: goPrev,
                ArrowRight: goNext,
            };
            const action = actions[e.key];
            if (!action) return;
            e.preventDefault();
            action();
        };
        // Stop a focused button from also being clicked by the Space keyup.
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === " " && e.target instanceof HTMLButtonElement && segmentRef.current) e.preventDefault();
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [togglePlay, playSegment, goPrev, goNext]);

    return (
        <section className="kecho">
            <style>{CSS}</style>

            <form className="kecho-search" role="search" onSubmit={onSubmit}>
                <input
                    className="kecho-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="표현 검색 (예: 괜찮아) 또는 등록된 영상 주소"
                    aria-label="검색어"
                    maxLength={100}
                />
                <button className="kecho-submit" type="submit" disabled={loading}>
                    {loading ? "검색 중…" : "검색"}
                </button>
            </form>

            {suggestions.length > 0 && (
                <div className="kecho-chips" aria-label="추천 검색어">
                    <span className="kecho-chips-label">추천</span>
                    {suggestions.map((raw) => normalizeKeyword(raw)).map((word) => (
                        <button
                            key={word}
                            type="button"
                            className="kecho-chip"
                            aria-pressed={word === query}
                            onClick={() => runSearch(word)}
                        >
                            #{word}
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <p className="kecho-notice kecho-error" role="alert">
                    {error}
                </p>
            )}
            {(query || video) && !loading && !error && total === 0 && (
                <div className="kecho-notice">
                    <p>{video ? "아직 등록되지 않은 영상입니다." : `“${query}”이(가) 나오는 장면이 없습니다.`}</p>
                </div>
            )}
            {total > 0 && matchedQuery && matchedQuery !== query && (
                <p className="kecho-notice">
                    “{query}”와 정확히 일치하는 장면이 없어 “{matchedQuery}”이(가) 들어간 장면을 보여드려요.
                </p>
            )}

            <div className="kecho-stage" hidden={!current}>
                <div className="kecho-meta">
                    <span className="kecho-badge kecho-drama">{current?.drama_title}</span>
                    {total > 0 && (
                        <span className="kecho-badge kecho-count" aria-live="polite">
                            <b>{index}</b>
                            <span className="kecho-count-sep">/</span>
                            {total}
                        </span>
                    )}
                </div>

                <div ref={hostRef} className="kecho-player" />

                {current && (
                    <div className="kecho-captions" aria-live="polite">
                        <p className="kecho-kr">
                            <Highlight text={current.kr_text} keyword={matchedQuery || query} />
                        </p>
                        {current.en_text && (
                            <p className="kecho-en">
                                <Highlight text={current.en_text} keyword={matchedQuery || query} />
                            </p>
                        )}
                        <p className="kecho-time">
                            {formatTime(current.start_time)} – {formatTime(current.end_time)}
                        </p>
                    </div>
                )}

                <div className="kecho-controls">
                    <button type="button" onClick={goPrev} disabled={!hasPrev || loading}>
                        ◀ 이전 장면
                    </button>
                    <button type="button" onClick={playSegment} disabled={!current}>
                        ↺ 다시 재생
                    </button>
                    <button type="button" onClick={goNext} disabled={!hasNext || loading}>
                        다음 장면 ▶
                    </button>
                    <button
                        type="button"
                        className="kecho-loop"
                        onClick={toggleLoop}
                        aria-pressed={loop}
                        disabled={!current}
                    >
                        <span className="kecho-switch" aria-hidden="true">
                            <span className="kecho-knob" />
                        </span>
                        구간 반복 <span className="kecho-loop-state">{loop ? "ON" : "OFF"}</span>
                    </button>
                </div>

                <p className="kecho-shortcuts">
                    <kbd>Space</kbd> 재생/일시정지 <kbd>R</kbd> 다시 재생 <kbd>←</kbd>
                    <kbd>→</kbd> 장면 이동
                </p>
            </div>
        </section>
    );
}

const CSS = `
.kecho { --bg:#0f1020; --panel:#1a1b33; --line:#2c2e55; --text:#f4f4ff; --muted:#a3a5c9; --accent:#ff4f7b; --hl:#ffe14d;
  max-width:880px; margin:0 auto; padding:24px; color:var(--text); background:var(--bg); border-radius:20px;
  font-family:"Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif; }
.kecho-search { display:flex; gap:10px; }
.kecho-input { flex:1; min-width:0; padding:14px 18px; font-size:18px; color:var(--text); background:var(--panel);
  border:2px solid var(--line); border-radius:14px; outline:none; }
.kecho-input:focus { border-color:var(--accent); }
.kecho-submit { flex:none; white-space:nowrap; padding:0 24px; font-size:17px; font-weight:700; color:#fff; background:var(--accent);
  border:0; border-radius:14px; cursor:pointer; }
.kecho-submit:disabled { opacity:.6; cursor:default; }
.kecho-chips { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:12px; }
.kecho-chips-label { font-size:12px; font-weight:800; color:var(--muted); margin-right:2px; }
.kecho-chip { padding:7px 14px; font:inherit; font-size:14px; font-weight:700; color:var(--text); background:var(--panel);
  border:1px solid var(--line); border-radius:999px; cursor:pointer; transition:border-color .15s, background .15s, color .15s; }
.kecho-chip:hover { border-color:var(--accent); color:#ff9ab4; }
.kecho-chip[aria-pressed="true"] { color:#fff; background:var(--accent); border-color:var(--accent); }
.kecho-notice { margin:16px 0 0; color:var(--muted); }
.kecho-notice p { margin:0; }
.kecho-error { color:#ff8a8a; }
.kecho-stage { margin-top:20px; }
.kecho-stage[hidden] { display:none; }
.kecho-meta { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px; }
.kecho-badge { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; font-size:14px; font-weight:800;
  line-height:1; border-radius:999px; white-space:nowrap; }
.kecho-drama { color:#ff9ab4; background:rgba(255,79,123,.14); border:1px solid rgba(255,79,123,.45); }
.kecho-drama::before { content:""; width:7px; height:7px; border-radius:50%; background:var(--accent);
  box-shadow:0 0 8px var(--accent); }
.kecho-count { color:var(--muted); background:var(--panel); border:1px solid var(--line); font-variant-numeric:tabular-nums; }
.kecho-count b { color:var(--text); font-size:15px; }
.kecho-count-sep { opacity:.5; }
.kecho-player { position:relative; aspect-ratio:16/9; background:#000; border-radius:14px; overflow:hidden; }
.kecho-player iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
.kecho-captions { margin-top:16px; padding:24px 22px 18px; background:var(--panel); border-radius:16px; text-align:center; }
.kecho-kr { margin:0; font-size:34px; font-weight:800; line-height:1.45; letter-spacing:-.02em; color:#fff; word-break:keep-all; }
.kecho-en { margin:10px 0 0; font-size:18px; font-weight:500; line-height:1.45; color:rgba(244,244,255,.55); }
.kecho-time { margin:14px 0 0; font-size:12px; color:rgba(244,244,255,.4); font-variant-numeric:tabular-nums; }
.kecho-mark { color:#16122b; font-weight:900; background:linear-gradient(120deg,#fff06b,#ffc53d);
  padding:.02em .2em; margin:0 .04em; border-radius:.3em; -webkit-box-decoration-break:clone; box-decoration-break:clone;
  box-shadow:0 0 0 2px rgba(255,214,61,.25), 0 4px 16px rgba(255,197,61,.35); }
.kecho-en .kecho-mark { color:#16122b; box-shadow:0 0 0 1px rgba(255,214,61,.3); }
.kecho-controls { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:16px; }
.kecho-controls button { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px 8px;
  font-size:15px; font-weight:700; color:var(--text); background:var(--panel); border:2px solid var(--line);
  border-radius:12px; cursor:pointer; transition:background .15s, border-color .15s, box-shadow .15s; }
.kecho-controls button:hover:not(:disabled) { border-color:var(--accent); }
.kecho-controls button:disabled { opacity:.4; cursor:default; }
.kecho-switch { position:relative; width:34px; height:20px; flex:none; border-radius:999px; background:var(--line);
  transition:background .2s; }
.kecho-knob { position:absolute; top:3px; left:3px; width:14px; height:14px; border-radius:50%; background:#c9cbe8;
  transition:transform .2s, background .2s; }
.kecho-loop-state { min-width:2.2em; font-size:12px; font-weight:900; color:var(--muted); }
.kecho-loop[aria-pressed="true"] { background:rgba(255,79,123,.16); border-color:var(--accent);
  box-shadow:0 0 0 3px rgba(255,79,123,.18); }
.kecho-loop[aria-pressed="true"] .kecho-switch { background:var(--accent); }
.kecho-loop[aria-pressed="true"] .kecho-knob { transform:translateX(14px); background:#fff; }
.kecho-loop[aria-pressed="true"] .kecho-loop-state { color:var(--accent); }
.kecho-shortcuts { margin:14px 0 0; font-size:12px; color:var(--muted); text-align:center; }
.kecho-shortcuts kbd { display:inline-block; min-width:1.6em; margin:0 2px 0 8px; padding:2px 6px; font:inherit;
  font-weight:700; color:var(--text); background:var(--panel); border:1px solid var(--line); border-bottom-width:2px;
  border-radius:6px; }
.kecho-shortcuts kbd + kbd { margin-left:2px; }
@media (max-width:600px) {
  .kecho { padding:16px; }
  .kecho-kr { font-size:26px; }
  .kecho-en { font-size:16px; }
  .kecho-controls { grid-template-columns:repeat(2,1fr); }
}
`;
