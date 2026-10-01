import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

type PopupMode = 'always' | 'interval';
type PopupLinkType = 'none' | 'url' | 'pdf';

interface PopupConfigForm {
  enabled: boolean;
  mode: PopupMode;
  intervalHours: number;
  title: string;
  message: string;
  bulletsText: string;
  primaryLabel: string;
  linkType: PopupLinkType;
  linkUrl: string;
  linkLabel: string;
}

const DEFAULT_POPUP_CONFIG: PopupConfigForm = {
  enabled: true,
  mode: 'always',
  intervalHours: 24,
  title: 'Bienvenue sur le portail public',
  message: "Acces rapide aux informations et services essentiels de l'ANAM.",
  bulletsText: [
    'Rechercher des notes, lois et formulaires.',
    'Explorer les sections par categories.',
    'Acceder a vos applications internes.'
  ].join('\n'),
  primaryLabel: 'Decouvrir',
  linkType: 'none',
  linkUrl: '',
  linkLabel: ''
};

const AdminPopupManger: React.FC<{ onError?: (error: string) => void }> = ({ onError }) => {
  const [popupConfig, setPopupConfig] = useState<PopupConfigForm>(DEFAULT_POPUP_CONFIG);
  const [popupStatus, setPopupStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [popupFeedback, setPopupFeedback] = useState<string | null>(null);
  const [popupUploadStatus, setPopupUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [popupUploadFeedback, setPopupUploadFeedback] = useState<string | null>(null);

  const mapPopupConfig = useCallback((data: any): PopupConfigForm => {
    const hasBulletsArray = Array.isArray(data?.bullets);
    const bulletsArray = hasBulletsArray
      ? data.bullets.map((item: any) => String(item).trim()).filter(Boolean)
      : [];

    const intervalValue = Number(data?.intervalHours);

    return {
      enabled: data?.enabled !== false,
      mode: data?.mode === 'always' ? 'always' : 'interval',
      intervalHours: Number.isFinite(intervalValue) && intervalValue > 0 ? intervalValue : DEFAULT_POPUP_CONFIG.intervalHours,
      title: typeof data?.title === 'string' ? data.title.trim() : DEFAULT_POPUP_CONFIG.title,
      message: typeof data?.message === 'string' ? data.message.trim() : DEFAULT_POPUP_CONFIG.message,
      bulletsText: hasBulletsArray ? bulletsArray.join('\n') : DEFAULT_POPUP_CONFIG.bulletsText,
      primaryLabel: typeof data?.primaryLabel === 'string' && data.primaryLabel.trim()
        ? data.primaryLabel.trim()
        : DEFAULT_POPUP_CONFIG.primaryLabel,
      linkType: data?.linkType === 'url' || data?.linkType === 'pdf' ? data.linkType : 'none',
      linkUrl: typeof data?.linkUrl === 'string' ? data.linkUrl.trim() : '',
      linkLabel: typeof data?.linkLabel === 'string' ? data.linkLabel.trim() : ''
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPopupConfig = async () => {
      setPopupStatus('loading');
      setPopupFeedback(null);
      try {
        const response = await api.get('/public/popup-config');
        if (!isMounted) return;
        setPopupConfig(mapPopupConfig(response.data));
        setPopupStatus('idle');
      } catch (error: any) {
        if (!isMounted) return;
        setPopupStatus('error');
        setPopupFeedback('Impossible de charger la configuration du pop-up.');
        if (error?.response?.status === 401 && onError) {
          onError('Session expiree. Veuillez vous reconnecter.');
        }
      }
    };

    loadPopupConfig();

    return () => {
      isMounted = false;
    };
  }, [mapPopupConfig, onError]);

  const handlePopupSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setPopupStatus('saving');
    setPopupFeedback(null);

    const bullets = popupConfig.bulletsText
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 6);

    const payload = {
      enabled: popupConfig.enabled,
      mode: popupConfig.mode,
      intervalHours: popupConfig.intervalHours,
      title: popupConfig.title,
      message: popupConfig.message,
      bullets,
      primaryLabel: popupConfig.primaryLabel,
      linkType: popupConfig.linkType,
      linkUrl: popupConfig.linkUrl,
      linkLabel: popupConfig.linkLabel
    };

    try {
      const response = await api.put('/admin/popup-config', payload);
      setPopupConfig(mapPopupConfig(response.data));
      setPopupStatus('saved');
      setPopupFeedback('Configuration enregistree.');
      setTimeout(() => setPopupStatus('idle'), 2000);
    } catch (error: any) {
      setPopupStatus('error');
      setPopupFeedback("Erreur lors de l'enregistrement.");
      if (error?.response?.status === 401 && onError) {
        onError('Session expiree. Veuillez vous reconnecter.');
      }
    }
  };

  const handlePopupFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPopupUploadStatus('uploading');
    setPopupUploadFeedback(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/admin/popup-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const fileUrl = response?.data?.url;
      if (!fileUrl) {
        throw new Error("URL manquante apres l'upload.");
      }

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      setPopupConfig(prev => ({
        ...prev,
        linkUrl: fileUrl,
        linkType: isPdf ? 'pdf' : 'url'
      }));

      setPopupUploadStatus('success');
      setPopupUploadFeedback("Fichier uploadé. Pensez a enregistrer.");
      setTimeout(() => setPopupUploadStatus('idle'), 2000);
    } catch (error: any) {
      setPopupUploadStatus('error');
      setPopupUploadFeedback(error?.message || "Erreur lors de l'upload.");
      if (error?.response?.status === 401 && onError) {
        onError('Session expiree. Veuillez vous reconnecter.');
      }
    } finally {
      event.target.value = '';
    }
  };

  const handlePopupReset = () => {
    setPopupConfig(DEFAULT_POPUP_CONFIG);
    setPopupFeedback(null);
    setPopupStatus('idle');
  };

  return (
    <div className="p-4 bg-white rounded shadow-sm">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h2 className="h4 fw-bold mb-1">Pop-up portail public</h2>
          <p className="small text-secondary mb-0">Configurer l'affichage du pop-up d'accueil.</p>
        </div>
        {popupStatus === 'loading' && (
          <span className="text-muted small">Chargement...</span>
        )}
      </div>
      {popupFeedback && (
        <div className={`alert ${popupStatus === 'error' ? 'alert-danger' : 'alert-success'} mb-3`}>
          {popupFeedback}
        </div>
      )}
      <form onSubmit={handlePopupSave}>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Activer le pop-up</label>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="popupEnabled"
                checked={popupConfig.enabled}
                onChange={(event) => setPopupConfig(prev => ({ ...prev, enabled: event.target.checked }))}
              />
              <label className="form-check-label" htmlFor="popupEnabled">Visible</label>
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Frequence</label>
            <select
              className="form-select"
              value={popupConfig.mode}
              onChange={(event) => setPopupConfig(prev => ({ ...prev, mode: event.target.value as PopupMode }))}
            >
              <option value="always">A chaque chargement</option>
              <option value="interval">Toutes les X heures</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Intervalle (heures)</label>
            <input
              className="form-control"
              type="number"
              min={1}
              value={popupConfig.intervalHours}
              disabled={popupConfig.mode !== 'interval'}
              onChange={(event) => setPopupConfig(prev => ({
                ...prev,
                intervalHours: Math.max(1, Number(event.target.value) || 1)
              }))}
            />
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Titre</label>
            <input
              className="form-control"
              dir="auto"
              value={popupConfig.title}
              onChange={(event) => setPopupConfig(prev => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Message</label>
            <textarea
              className="form-control"
              dir="auto"
              rows={2}
              value={popupConfig.message}
              onChange={(event) => setPopupConfig(prev => ({ ...prev, message: event.target.value }))}
            />
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Puces (une par ligne)</label>
            <textarea
              className="form-control"
              dir="auto"
              rows={3}
              value={popupConfig.bulletsText}
              onChange={(event) => setPopupConfig(prev => ({ ...prev, bulletsText: event.target.value }))}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Texte bouton principal</label>
            <input
              className="form-control"
              dir="auto"
              value={popupConfig.primaryLabel}
              onChange={(event) => setPopupConfig(prev => ({ ...prev, primaryLabel: event.target.value }))}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Type de lien</label>
            <select
              className="form-select"
              value={popupConfig.linkType}
              onChange={(event) => setPopupConfig(prev => ({ ...prev, linkType: event.target.value as PopupLinkType }))}
            >
              <option value="none">Aucun</option>
              <option value="url">Lien externe</option>
              <option value="pdf">Lien PDF</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">URL (lien ou PDF)</label>
            <input
              className="form-control"
              value={popupConfig.linkUrl}
              disabled={popupConfig.linkType === 'none'}
              placeholder="https://exemple.dz/document.pdf"
              onChange={(event) => setPopupConfig(prev => ({ ...prev, linkUrl: event.target.value }))}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Importer un fichier (PDF ou image)</label>
            <input
              type="file"
              className="form-control"
              accept=".pdf,image/*"
              onChange={handlePopupFileUpload}
              disabled={popupUploadStatus === 'uploading'}
            />
            {popupUploadFeedback && (
              <div className={`small mt-2 ${popupUploadStatus === 'error' ? 'text-danger' : 'text-success'}`}>
                {popupUploadFeedback}
              </div>
            )}
          </div>
        </div>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handlePopupReset}
            disabled={popupStatus === 'saving'}
          >
            Reinitialiser
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={popupStatus === 'saving'}
          >
            {popupStatus === 'saving' ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminPopupManger;
