import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./daynize/Layout";
import KEchoPage from "./kecho/KEchoPage";

export default function App() {
    return (
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Routes>
                <Route element={<Layout />}>
                    <Route index element={<KEchoPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
