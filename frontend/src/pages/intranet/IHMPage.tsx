import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './IHMPage.css';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { platforms } from '../data';

const IHMPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRows = platforms.filter(row => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [
      row.nom,
      row.description,
      row.fournisseur,
      row.type
    ]
      .filter(Boolean)
      .some(value => value!.toLowerCase().includes(q));
  });

  const renderCell = (value?: string) => (value && value.trim().length > 0 ? value : '—');

  return (
    <div className="ihm-page">
      <div className="container py-4">
        <div className="ihm-header card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="ihm-header-top">
              <div className="ihm-title-block">
                <div>
                  <h1 className="h3 fw-bold mb-1">Interfaces et Plateformes (IHM)</h1>
                  <p className="mb-0 text-muted">Accès aux plateformes et services numériques utilisés par l'organisation.</p>
                </div>
              </div>
              <div className="ihm-header-actions">
                <button
                  type="button"
                  className="btn btn-outline-secondary ihm-back-btn"
                  onClick={() => navigate(-1)}
                >
                  Retour
                </button>
              </div>
            </div>
            <div className="ihm-header-bottom">
              <div className="ihm-search">
                <input
                  type="text"
                  className="form-control ihm-search-input"
                  placeholder="Rechercher par nom, fournisseur..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="ihm-table-wrapper">
          <div className="table-responsive">
            <table className="table ihm-table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th className="text-center">N°</th>
                  <th>Nom</th>
                  <th>Description</th>
                  <th>Fournisseur</th>
                  <th>Type</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => {
                  return (
                    <tr key={row.id}>
                      <td className="text-center">{index + 1}</td>
                      <td className="fw-semibold">{renderCell(row.nom)}</td>
                      <td className="text-break">{renderCell(row.description)}</td>
                      <td>{renderCell(row.fournisseur)}</td>
                      <td>
                        <span className={`badge ${row.type === 'Interne' ? 'bg-success' : 'bg-primary'}`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="text-center">
                        <a
                          href={row.lien}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-button"
                        >
                          <ExternalLink size={18} />
                          <span>Accéder</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ihm-footer">
          (c) {new Date().getFullYear()} Agence Nationale des Activités Minières. Tous droits reservés.
        </div>
      </div>
    </div>
  );
};

export default IHMPage;
