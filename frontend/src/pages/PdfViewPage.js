import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
const PdfViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [numPages, setNumPages] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewUrl, setViewUrl] = useState('');
    useEffect(() => {
        if (!id) {
            setError("ID de l'article manquant dans l'URL");
            setLoading(false);
            return;
        }
        const loadProtectedPdf = async () => {
            try {
                setLoading(true);
                setError(null);
                // Appel important : credentials: 'include' + envoi du token si stocké
                const tokenRes = await fetch(`/api/articles/${id}/pdf/token`, {
                    method: 'POST',
                    credentials: 'include', // ← Important
                    headers: {
                        'Content-Type': 'application/json',
                        // Si tu stockes le token dans localStorage, tu peux l'ajouter ici :
                        // Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
                    },
                });
                if (!tokenRes.ok) {
                    const errorData = await tokenRes.json().catch(() => ({}));
                    throw new Error(errorData.error || `Erreur ${tokenRes.status}`);
                }
                const { token } = await tokenRes.json();
                const url = `/api/articles/${id}/pdf/view?token=${encodeURIComponent(token)}`;
                setViewUrl(url);
            }
            catch (err) {
                console.error(err);
                setError(err.message || "Impossible de charger le PDF protégé. Vérifiez que vous êtes connecté en tant que superadmin.");
            }
            finally {
                setLoading(false);
            }
        };
        loadProtectedPdf();
    }, [id]);
    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setLoading(false);
    };
    const onDocumentLoadError = (err) => {
        console.error(err);
        setError("Erreur lors du chargement du PDF (fichier peut-être corrompu)");
        setLoading(false);
    };
    if (loading) {
        return _jsx("div", { className: "min-h-screen flex items-center justify-center text-xl", children: "Chargement du document prot\u00E9g\u00E9..." });
    }
    if (error) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center p-6", children: _jsxs("div", { className: "bg-white max-w-md w-full p-8 rounded-2xl shadow-xl text-center", children: [_jsx("h2", { className: "text-red-600 text-2xl font-bold mb-4", children: "Erreur" }), _jsx("p", { className: "text-gray-700 mb-6", children: error }), _jsx("button", { onClick: () => navigate(-1), className: "px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-black", children: "Retour" })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-gray-50 py-8 px-4", children: _jsxs("div", { className: "max-w-5xl mx-auto", children: [_jsxs("div", { className: "bg-white rounded-2xl shadow-xl p-6 mb-8", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: "Document Prot\u00E9g\u00E9" }), _jsx("p", { className: "text-red-600 font-semibold text-lg", children: "Mode Lecture Seule \u2014 Copie de texte bloqu\u00E9e" })] }), _jsx("div", { className: "bg-white p-8 rounded-2xl shadow-xl", children: _jsx(Document, { file: viewUrl, onLoadSuccess: onDocumentLoadSuccess, onLoadError: onDocumentLoadError, loading: _jsx("div", { className: "py-12 text-center", children: "Chargement des pages..." }), children: Array.from(new Array(numPages), (_, index) => (_jsx("div", { className: "flex justify-center my-6", children: _jsx(Page, { pageNumber: index + 1, renderTextLayer: false, renderAnnotationLayer: false, scale: 1.2, className: "shadow-2xl select-none pointer-events-none mx-auto" }) }, index))) }) })] }) }));
};
export default PdfViewPage;
