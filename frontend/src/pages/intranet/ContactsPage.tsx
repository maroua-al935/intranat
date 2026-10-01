import React, { useEffect, useMemo, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './AntennesPage.css';
import './ContactsPage.css';
import { useNavigate } from 'react-router-dom';
import { INTERNAL_EXTENSIONS_DATA } from './internalExtensionsData';

type ContactRow = {
  telephone: string;
  nomPrenom: string;
  poste: string;
  affectation: string;
  extension: string;
};
const CONTACTS_RAW = `
0661490094	BOUZIAD MOURAD	INGENIEUR EXPERT
0661479003	ABCHICHE RACHID	MEMBRE DE COMITIE
0661490378	MESSABHIA ABDELHAMID	INGENIEUR POLICE DES MINES
0661490377	MERABTI SAIDA	CHEF D'ANTENNE MILA
0661490395	ZAHI TOUFIK	INGENIEUR POLICE DES MINES
0661490392	ZIADI ZOUBIR	INGENIEUR POLICE DES MINES
0661490391	SALHI ABDELLAH	CHEF D'ANTENNE BECHAR
0661490390	MOUSSAI MOHAMED ABDALLAH	INGENIEUR POLICE DES MINES
0661490256	CHOUKI REDOUANE MAHMOUD	CHEF D'ANTENNE SETIF
0661490234	BOUKOUBA SALIM	CHEF D'ANTENNE OUM EL BOUAGHI
0661490233	BABOURI ABDELHAK	INGENIEUR POLICE DES MINES
0661490271	AIT AMER MEZIANE YOUCEF	INGENIEUR EXPERT
0661332481	ZOUCHOUNE MOURAD	INGENIEUR POLICE DES MINES
0661332471	MENACER ABD ELHAFID	INGENIEUR POLICE DES MINES
0661332464	METATLA ABDELLAH	INGENIEUR POLICE DES MINES
0661332416	SEHAB YACINE	INGENIEUR POLICE DES MINES
0661332311	BAIRA ALLA EDDINE	INGENIEUR POLICE DES MINES
0661332270	KHOUFACHE TOUFIK	CHEF D'ANTENNE OUARGLA
0661332246	GHANAI RAFIK	INGENIEUR POLICE DES MINES
0661332227	CHEKAOUI DJAMEL	CHEF D'ANTENNE DJANET
0661331853	AIT AMEUR MOHAND	CHAUFFEUR
0661331840	AIT OUARET RAHIM	CHEF D'ANTENNE TIARET
0661332514	BOUABDALLAH MAHA	CHEF D'ANTENNE GUELMA
0661936509	SAADI BOUDJEMAA	CHEF D'ANTENNE TEBASSA
0661936506	DAOUDI ABDELHAKIM	CHEF D'ANTENNE BLIDA
0661936436	KHELIFI ABDELHAFID	INGENIEUR POLICE DES MINES
0661936431	BOULAHBEL ABD ELHAMID	CHEF D'ANTENNE BBA
0661936399	ALAOUI MAHMOUD	INGENIEUR POLICE DES MINES
0661936349	ABASSI FAIZ	INGENIEUR POLICE DES MINES
0661936346	BOUAZA AISSA	INGENIEUR POLICE DES MINES
0661936499	BOUALLAG HOCINE	CHEF D'ANTENNE BATNA
0661936327	BARKAT HAMZA	CHEF DE BUREAU REGIONALE
0661923427	HOUCINE BRAHIM	INGENIEUR POLICE DES MINES
0661923426	BOUANIK ABDELKADER	CHEF DE DEPARTEMENT RECHERCHE
0661923424	BOUTORA RAMDANE	INGENIEUR POLICE DES MINES
0661923423	MOKHTARI TOUFIK	CHEF D'ANTENNE TLEMCEN
0661923422	SAADI OUASSILA	CHEF D'ANTENNE ORAN
0661923420	KHATIR ABDELHALIM	INGENIEUR POLICE DES MINES
0661923419	ZERIZER ZAKARIA	INGENIEUR POLICE DES MINES
0661923418	MEKARZIA MUSTAPHA	MEMBRE DE COMITIE
0661922558	SKANDER ABD ELKADER	INGENIEUR POLICE DES MINES
0661922556	BOUKHALFA MAHMOUD	INGENIEUR POLICE DES MINES
0661922555	KHORSI MHAMED	INGENIEUR POLICE DES MINES
0661922553	BOUKERNOUS OMAR	INGENIEUR POLICE DES MINES
0661922551	BOUBIDI LARBI	CHEF D'ANTENNE BOUMERDES
0661922549	HADJILI SALAH	INGENIEUR POLICE DES MINES
0661922548	HAMITOUCHE NABIL	INGENIEUR POLICE DES MINES
0661922547	BELOUATTER BELHOUCHET	INGENIEUR POLICE DES MINES
0661922546	ZAIDI AREZKI	INGENIEUR POLICE DES MINES
0661922544	DERRADJ AHMED	INGENIEUR POLICE DES MINES
0661922543	NEGGAH ABD ELKADER	INGENIEUR POLICE DES MINES
0661259205	LOUARED MOHAMED	INGENIEUR POLICE DES MINES
0661499011	ZAIMEN MOHAMED	INGENIEUR POLICE DES MINES
0661499007	KOUCHIH HASSEN	CHEF D'ANTENNE CHLEF
0661499005	BOUDCHICHA MOURAD	CHEF D'ANTENNE CONSTANTINE
0661499004	LOUKAL HOCINE	INGENIEUR POLICE DES MINES
0661499003	SLOUGUI MEHDI	CHARGE DES MOYENS GENERAUX P/I
0661413734	EL DJOUZI SMAIL	PCD
0661992517	BOUKHELIF BENYOUCEF	MEMBRE DE COMITIE
0661992154	ATTOUM ABDELLAH	ING EXPERT
0661887587	LASSAMI SOFIANE	ACHETEUR DEMARCHEUR
0661887976	YOUNSI MOHMED	CHEF DE SERVICE INFORMATIQUE
0661888312	BILAL BEN KACI-ALI	CHEF DE SECTION
0661826727	KAZI-TANI NACEREDDINE	CONSULTANT EXPERT
0661826426	AKROUR ZAHIR	CHEF DE DEPARTEMENT FISCALITE
0661823837	AOULI ESSAID	CONSEILLER EN RECHERCHE
0661825611	KEFAIFI ALI	CONSULTANT EXPERT
0661783520	MALTI CHAHINEZ(MEHTARI)	CHEF DE DEPT DES CONTENTIEUX
0661735565	MABROUK KAMEL	INGENIEUR POLICE DES MINES
0661734023	LEBIED ABDELGHANI	INGENIEUR POLICE DES MINES
0661738732	BENHANNACHI ANIS	INGENIEUR POLICE DES MINES
0661728631	BELHAMEL BILLAL	INGENIEUR POLICE DES MINES
0661727546	LAIDI NOUREDDINE	INGENIEUR POLICE DES MINES
0661729387	BOUTERFAS ABDERRAHIM	INGENIEUR POLICE DES MINES
0661723490	YEKHLEF BOUKHMIS	INGENIEUR POLICE DES MINES
0661729713	GHERBI AHMED	INGENIEUR POLICE DES MINES
0661726051	IKHLEF BOUKHMIS	INGENIEUR POLICE DES MINES
0661705349	ACHOURI FICEL	INGENIEUR POLICE DES MINES
0661708742	LABIOUDE MAWLOUD	CHEF D'ANTENNE SAIDA
0661696675	LALOU ADEL	INGENIEUR POLICE DES MINES
0661689253	BENHOCINE MOHAMED	INGENIEUR POLICE DES MINES
0661674287	BRAHIM CHEBILLA	MINISTERE(CHARGE DE LA SURETE INTERNE)
0661589700	FELFOUL HANIYA	CHEF DE SERVICE DES RESSOURCES HUMAINES
0661560075	ALIMERINA ABDELKADER	CHARGE DES MISSIONS(TECHNICIEN SUPERIEUR)
0661525608	LAHMER LOTFI	CHEF DE DEPARTEMENT FINANCE ET COMPTABILITE
0661496682	MEHANNECHE MOHAMED	INGENIEUR POLICE DES MINES
0661493479	LOUNES AMELE	CHEF DE SERVICE DES CONTENTIEUX
0661489370	BOULAABAIZ NAZIHA	INGENIEUR POLICE DES MINES
0661485531	BOUAIFI ADLI	INGENIEUR POLICE DES MINES
0661423960	CHERGUI IKRAM	JURISTE CONTENTIEUX
0661399674	KELKOUL MOHAMED	INGENIEUR POLICE DES MINES
0661387960	CHOUAR NOUREDDINE	CHEF D'ANTENNE TAMANRASSET
0661378851	BELLIR HANANE	INGENIEUR POLICE DES MINES
0661376341	AYAD LARBI	INGENIEUR POLICE DES MINES
0661349370	BRAKNI FATIHA	INGENIEUR POLICE DES MINES
0661299971	AISSAOUI NOURI	INGENIEUR POLICE DES MINES
0661295972	MEHOUI FAOUZI	CHEF D'ANTENNE DJELFA
0661286386	KARADJA LAMIA(MOKDAD HOURIA)	CHARGER DES DOSSIER DU COMMITE DE DIRECTION
0661242239	ALIMERINA ABDENOUR	CHEF DE DEPARTEMENT PROMOTION
0661222074	KAID MOURAD	CHEF DEPARTEMENT CADASTRE
0661226058	DJADI KAMEL	CHAUFFEUR
`;
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const cleanText = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toNameKey = (value: string): string =>
  normalize(cleanText(value)).replace(/[^a-z0-9]/g, '');

const sanitizeExtension = (value: string): string => {
  const cleaned = cleanText(value).replace(/\s*\/\s*/g, '/');
  return cleaned;
};

const INTERNAL_BY_NAME = (() => {
  const byName = new Map<string, { nomPrenom: string; affectation: string; extension: string }>();

  INTERNAL_EXTENSIONS_DATA.forEach((entry) => {
    const nomPrenom = cleanText(entry.nomPrenom);
    const affectation = cleanText(entry.affectation);
    const extension = sanitizeExtension(entry.extension);
    const key = toNameKey(nomPrenom);

    if (!key || !extension) return;
    if (!byName.has(key)) {
      byName.set(key, { nomPrenom, affectation, extension });
    }
  });

  return byName;
})();

const CONTACT_ROWS: ContactRow[] = (() => {
  const seen = new Set<string>();
  const rows: ContactRow[] = [];

  CONTACTS_RAW.split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split('\t').map((part) => part.trim()).filter(Boolean);
      if (parts.length < 3) return;
      if (!/^\d{10}$/.test(parts[0])) return;

      const maybeExtension = parts[parts.length - 1];
      const hasExtension = /^\d{4}$/.test(maybeExtension);
      const core = hasExtension ? parts.slice(2, -1) : parts.slice(2);

      let poste = '';
      let affectation = '';
      if (core.length >= 2) {
        affectation = core[0];
        poste = core.slice(1).join(' ');
      } else {
        poste = core.join(' ');
      }

      const row: ContactRow = {
        telephone: parts[0],
        nomPrenom: cleanText(parts[1]),
        poste: cleanText(poste),
        affectation: cleanText(affectation),
        extension: hasExtension ? maybeExtension : ''
      };

      const key = `${row.telephone}|${row.nomPrenom}|${row.poste}|${row.affectation}|${row.extension}`;
      if (seen.has(key)) return;

      seen.add(key);
      rows.push(row);
    });

  const matchedNames = new Set<string>();

  rows.forEach((row) => {
    const nameKey = toNameKey(row.nomPrenom);
    if (!nameKey) return;

    const internalData = INTERNAL_BY_NAME.get(nameKey);
    if (!internalData) return;

    matchedNames.add(nameKey);

    if (!row.extension) row.extension = internalData.extension;
    if (!row.affectation) row.affectation = internalData.affectation;
  });

  INTERNAL_BY_NAME.forEach((entry, nameKey) => {
    if (matchedNames.has(nameKey)) return;

    const row: ContactRow = {
      telephone: '',
      nomPrenom: entry.nomPrenom,
      poste: '',
      affectation: entry.affectation,
      extension: entry.extension
    };

    const key = `${row.telephone}|${row.nomPrenom}|${row.poste}|${row.affectation}|${row.extension}`;
    if (seen.has(key)) return;

    seen.add(key);
    rows.push(row);
  });

  return rows;
})();

const PAGE_SIZE = 25;

type ContactsPageProps = {
  onClose?: () => void;
};

const ContactsPage: React.FC<ContactsPageProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<'phones' | 'internals'>('phones');
  const [selectedRow, setSelectedRow] = useState<ContactRow | null>(null);

  const filteredRows = useMemo(() => {
    const queryTokens = normalize(searchQuery).split(/\s+/).filter(Boolean);

    const rows = CONTACT_ROWS.filter((row) => {
      if (mode === 'phones' && !row.telephone) return false;
      if (mode === 'internals' && !row.extension) return false;
      if (!queryTokens.length) return true;

      const haystack = normalize(
        `${row.nomPrenom} ${row.poste} ${row.affectation} ${row.telephone} ${row.extension}`
      );
      return queryTokens.every((token) => haystack.includes(token));
    });

    if (mode === 'internals') {
      return [...rows].sort((a, b) => {
        const byExtension = a.extension.localeCompare(b.extension, 'fr');
        if (byExtension !== 0) return byExtension;
        return a.nomPrenom.localeCompare(b.nomPrenom, 'fr');
      });
    }

    return rows;
  }, [mode, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRow(null);
  }, [mode]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRows]);

  return (
    <div className="antennes-page contacts-page">
      <div className="container py-4">
        <div className="antennes-header card border-0 shadow-sm mb-4 contacts-hero">
          <div className="card-body">
            <div className="antennes-header-top">
              <div className="antennes-title-block">
                <div>
                  <h1 className="h3 fw-bold mb-1">Contact</h1>
                  <p className="mb-0 text-muted">Annuaire telephonique.</p>
                </div>
              </div>
              <div className="antennes-header-actions">
                <button
                  type="button"
                  className="btn btn-outline-secondary antennes-back-btn"
                  onClick={onClose || (() => navigate(-1))}
                >
                  Retour
                </button>
                <img
                  src="/logoanam.png"
                  alt="Logo ANAM"
                  className="antennes-logo"
                />
              </div>
            </div>

            <div className="antennes-header-bottom contacts-toolbar">
              <div className="antennes-search contacts-search">
                <input
                  type="text"
                  className="form-control antennes-search-input"
                  placeholder="Rechercher par nom et prenom..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="contacts-mode-switch">
                <button
                  type="button"
                  className={`btn btn-sm contacts-mode-btn ${mode === 'phones' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setMode('phones')}
                >
                  Numéros de téléphone
                </button>
                <button
                  type="button"
                  className={`btn btn-sm contacts-mode-btn ${mode === 'internals' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setMode('internals')}
                >
                  Postes Internes (4 Chiffres)
                </button>
              </div>

              <div className="contacts-summary text-muted small">
                {filteredRows.length} contact(s) - page {currentPage}/{totalPages}
              </div>
            </div>
          </div>
        </div>

        <div className="antennes-table-wrapper contacts-table-shell">
          <div className="table-responsive">
            <table className="table antennes-table contacts-table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th className="text-center">N</th>
                  <th>Nom et prenom</th>
                  {mode === 'phones' ? (
                    <th className="text-nowrap">Numero de telephone</th>
                  ) : (
                    <th className="text-nowrap">Poste interne ( 4 Chiffres )</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr
                    key={`${row.telephone}-${row.nomPrenom}-${index}`}
                    className={`contacts-selectable-row ${selectedRow === row ? 'active' : ''}`}
                    onClick={() => setSelectedRow(row)}
                  >
                    <td className="text-center">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="text-break">{row.nomPrenom}</td>
                    {mode === 'phones' ? (
                      <td className="text-nowrap fw-semibold">{row.telephone}</td>
                    ) : (
                      <td className="text-nowrap fw-semibold">{row.extension || '-'}</td>
                    )}
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted py-4">
                      Aucun contact trouve pour cette recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedRow && (
          <div className="card border-0 shadow-sm mt-3 contacts-detail-card">
            <div className="card-body">
              <h2 className="h6 fw-bold mb-3">Detail du contact</h2>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="text-muted small">Nom et prenom</div>
                    <div className="fw-semibold">{selectedRow.nomPrenom || '-'}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Poste</div>
                    <div className="fw-semibold">{selectedRow.poste || '-'}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Numero de telephone</div>
                    <div className="fw-semibold">{selectedRow.telephone || '-'}</div>
                  </div>
              </div>
            </div>
          </div>
        )}

        <div className="contacts-pagination d-flex justify-content-center align-items-center gap-2 mt-3">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
            <button
              key={page}
              type="button"
              className={`btn btn-sm contacts-page-btn ${page === currentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
        </div>

        <div className="ihm-footer">
          (c) {new Date().getFullYear()} Agence Nationale des Activites Minieres. Tous droits reserves.
        </div>
      </div>
    </div>
  );
};

export default ContactsPage;
