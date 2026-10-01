import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, articlesAPI } from '../services/api';
const resolveFileUrl = (url) => {
    const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5001';
    if (!url)
        return '';
    if (url.startsWith('http'))
        return url;
    if (url.startsWith('/'))
        return `${backendUrl}${url}`;
    return `${backendUrl}/${url}`;
};
const ProtectedFileViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pageCount, setPageCount] = useState(0);
    const containerRef = useRef(null);
    const title = useMemo(() => article?.title || 'Document', [article?.title]);
    useEffect(() => {
        if (!id)
            return;
        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                const articleResp = await articlesAPI.getById(id);
                const a = articleResp.data;
                setArticle(a);
                // If not protected, this page isn't needed.
                if (!a?.pdfProtected) {
                    const href = resolveFileUrl(a?.pdfUrl || '');
                    if (href)
                        window.location.replace(href);
                    else
                        navigate(-1);
                    return;
                }
                // Fetch as ArrayBuffer then render via PDF.js to canvas.
                const fileResp = await api.get(`/articles/${id}/file`, { responseType: 'arraybuffer' });
                const data = fileResp.data;
                const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
                // Some environments (notably certain Linux server builds) fail to bundle the worker URL import.
                // For "protected view" mode we can render in the main thread.
                const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true });
                const pdf = await loadingTask.promise;
                setPageCount(pdf.numPages || 0);
                const root = containerRef.current;
                if (!root)
                    return;
                root.innerHTML = '';
                for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                    const page = await pdf.getPage(pageNumber);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(viewport.width);
                    canvas.height = Math.floor(viewport.height);
                    canvas.style.width = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.display = 'block';
                    canvas.style.background = '#fff';
                    canvas.style.borderRadius = '10px';
                    canvas.style.boxShadow = '0 1px 10px rgba(0,0,0,0.08)';
                    const wrapper = document.createElement('div');
                    wrapper.style.maxWidth = '1000px';
                    wrapper.style.margin = '16px auto';
                    wrapper.style.padding = '0 16px';
                    wrapper.appendChild(canvas);
                    root.appendChild(wrapper);
                    const ctx = canvas.getContext('2d', { alpha: false });
                    if (!ctx)
                        continue;
                    await page.render({ canvasContext: ctx, viewport }).promise;
                }
            }
            catch (e) {
                setError(e?.response?.data?.error || e?.message || 'Erreur lors du chargement du fichier');
            }
            finally {
                setLoading(false);
            }
        };
        run();
        const onKeyDown = (ev) => {
            const key = String(ev.key || '').toLowerCase();
            if (ev.ctrlKey || ev.metaKey) {
                if (['s', 'p', 'c', 'u'].includes(key)) {
                    ev.preventDefault();
                    ev.stopPropagation();
                }
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        const onCopyCut = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
        };
        document.addEventListener('copy', onCopyCut, true);
        document.addEventListener('cut', onCopyCut, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('copy', onCopyCut, true);
            document.removeEventListener('cut', onCopyCut, true);
        };
    }, [id, navigate]);
    if (loading) {
        return (_jsx("div", { className: "d-flex align-items-center justify-content-center", style: { height: '100vh' }, children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "spinner-border text-primary", role: "status" }), _jsx("div", { className: "mt-3 text-muted", children: "Chargement du fichier..." })] }) }));
    }
    if (error) {
        return (_jsxs("div", { className: "container py-4", children: [_jsx("h1", { className: "h5 fw-bold mb-3", children: "Impossible d'afficher le fichier" }), _jsx("div", { className: "alert alert-danger", children: error }), _jsx("button", { className: "btn btn-outline-secondary", onClick: () => navigate(-1), children: "Retour" })] }));
    }
    return (_jsxs("div", { onContextMenu: (e) => e.preventDefault(), style: { width: '100%', height: '100vh', background: '#f6f7f9', userSelect: 'none', WebkitUserSelect: 'none' }, children: [_jsxs("div", { className: "d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-white", style: { height: 52 }, children: [_jsx("div", { className: "fw-semibold text-truncate", style: { maxWidth: '70vw' }, children: title }), _jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: () => navigate(-1), children: "Fermer" })] }), _jsxs("div", { style: {
                    height: 'calc(100vh - 52px)',
                    overflow: 'auto',
                    padding: '10px 0',
                    cursor: 'default'
                }, children: [_jsx("div", { className: "text-center text-muted small", children: pageCount ? `${pageCount} page(s)` : '' }), _jsx("div", { ref: containerRef })] })] }));
};
export default ProtectedFileViewer;
