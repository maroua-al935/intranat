import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PdfViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewUrl, setViewUrl] = useState<string>('');

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
          credentials: 'include',                    // ← Important
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

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Impossible de charger le PDF protégé. Vérifiez que vous êtes connecté en tant que superadmin.");
      } finally {
        setLoading(false);
      }
    };

    loadProtectedPdf();
  }, [id]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (err: any) => {
    console.error(err);
    setError("Erreur lors du chargement du PDF (fichier peut-être corrompu)");
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Chargement du document protégé...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl text-center">
          <h2 className="text-red-600 text-2xl font-bold mb-4">Erreur</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-black"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h1 className="text-3xl font-bold mb-2">Document Protégé</h1>
          <p className="text-red-600 font-semibold text-lg">
            Mode Lecture Seule — Copie de texte bloquée
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl">
          <Document
            file={viewUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div className="py-12 text-center">Chargement des pages...</div>}
          >
            {Array.from(new Array(numPages), (_, index) => (
              <div key={index} className="flex justify-center my-6">
                <Page
                  pageNumber={index + 1}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  scale={1.2}
                  className="shadow-2xl select-none pointer-events-none mx-auto"
                />
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
};

export default PdfViewPage;